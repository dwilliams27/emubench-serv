const functions = require('@google-cloud/functions-framework');
const { ServicesClient } = require('@google-cloud/run');
const { Firestore } = require('@google-cloud/firestore');

// Configuration
const PROJECT_ID = process.env.PROJECT_ID || process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
const LOCATION = 'us-central1';
const TIMEOUT_MINUTES = parseInt(process.env.CLEANUP_TIMEOUT_MINUTES || '45');
const GAME_SERVICE_SUFFIX = '-game';

// Initialize clients
const servicesClient = new ServicesClient();
const firestore = new Firestore({
  projectId: PROJECT_ID,
});

/**
 * Extracts the test ID from a service name
 * Example: "tst-abc123xyz456-game" -> "tst-abc123xyz456"
 */
function extractTestIdFromServiceName(serviceName) {
  // Service name format: projects/PROJECT_ID/locations/LOCATION/services/SERVICE_ID
  const parts = serviceName.split('/');
  const serviceId = parts[parts.length - 1];

  if (!serviceId.endsWith(GAME_SERVICE_SUFFIX)) {
    return null;
  }

  return serviceId.slice(0, -GAME_SERVICE_SUFFIX.length);
}

/**
 * Checks if a service has exceeded the timeout threshold
 */
function isServiceStale(service, timeoutMinutes) {
  const now = Date.now();
  const createdTime = service.createTime ? new Date(service.createTime.seconds * 1000).getTime() : now;
  const updatedTime = service.updateTime ? new Date(service.updateTime.seconds * 1000).getTime() : createdTime;

  // Use the more recent timestamp (in case service was updated)
  const serviceTime = Math.max(createdTime, updatedTime);
  const ageMinutes = (now - serviceTime) / (1000 * 60);

  return ageMinutes > timeoutMinutes;
}

/**
 * Updates Firestore test record to mark it as timed out
 */
async function markTestAsTimedOut(testId) {
  try {
    const testRef = firestore.collection('tests').doc(testId);
    const testDoc = await testRef.get();

    if (!testDoc.exists) {
      console.log(`[CLEANUP] Test document ${testId} not found in Firestore, skipping update`);
      return false;
    }

    await testRef.update({
      'testState.status': 'error',
      'testState.error': 'Service timeout - cleaned up by job-killer',
      'emulatorState.status': 'error',
      'agentState.status': 'error',
    });

    console.log(`[CLEANUP] Updated Firestore for test ${testId}`);
    return true;
  } catch (error) {
    console.error(`[CLEANUP] Error updating Firestore for test ${testId}:`, error.message);
    return false;
  }
}

/**
 * Deletes a Cloud Run service and updates Firestore
 */
async function deleteStaleService(service) {
  const serviceName = service.name;
  const testId = extractTestIdFromServiceName(serviceName);

  if (!testId) {
    console.log(`[CLEANUP] Skipping service ${serviceName} - cannot extract test ID`);
    return { success: false, serviceName, reason: 'invalid_format' };
  }

  try {
    console.log(`[CLEANUP] Deleting service: ${serviceName} (test: ${testId})`);

    // Delete the Cloud Run service
    const [operation] = await servicesClient.deleteService({ name: serviceName });
    await operation.promise();

    console.log(`[CLEANUP] Successfully deleted service: ${serviceName}`);

    // Update Firestore
    await markTestAsTimedOut(testId);

    return { success: true, serviceName, testId };
  } catch (error) {
    console.error(`[CLEANUP] Error deleting service ${serviceName}:`, error.message);
    return { success: false, serviceName, testId, error: error.message };
  }
}

/**
 * Main cleanup function
 */
async function cleanupStaleServices() {
  const parent = `projects/${PROJECT_ID}/locations/${LOCATION}`;

  console.log(`[CLEANUP] Starting cleanup job for project ${PROJECT_ID} in ${LOCATION}`);
  console.log(`[CLEANUP] Timeout threshold: ${TIMEOUT_MINUTES} minutes`);

  try {
    // List all Cloud Run services in the location
    const [services] = await servicesClient.listServices({ parent });
    console.log(`[CLEANUP] Found ${services.length} total services`);

    // Filter for services ending with -game
    const gameServices = services.filter(service => {
      const serviceId = service.name.split('/').pop();
      return serviceId.endsWith(GAME_SERVICE_SUFFIX);
    });

    console.log(`[CLEANUP] Found ${gameServices.length} game services`);

    // Filter for stale services
    const staleServices = gameServices.filter(service =>
      isServiceStale(service, TIMEOUT_MINUTES)
    );

    console.log(`[CLEANUP] Found ${staleServices.length} stale services to clean up`);

    if (staleServices.length === 0) {
      console.log('[CLEANUP] No stale services found, exiting');
      return {
        totalServices: services.length,
        gameServices: gameServices.length,
        staleServices: 0,
        deleted: 0,
        failed: 0,
      };
    }

    // Delete stale services
    const results = await Promise.allSettled(
      staleServices.map(service => deleteStaleService(service))
    );

    // Count successes and failures
    const deleted = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;

    console.log(`[CLEANUP] Cleanup complete: ${deleted} deleted, ${failed} failed`);

    return {
      totalServices: services.length,
      gameServices: gameServices.length,
      staleServices: staleServices.length,
      deleted,
      failed,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }),
    };
  } catch (error) {
    console.error('[CLEANUP] Fatal error during cleanup:', error);
    throw error;
  }
}

// Cloud Function entry point
functions.cloudEvent('job-killer', async (cloudEvent) => {
  try {
    console.log('[CLEANUP] Job-killer function triggered');
    console.log('[CLEANUP] Event:', JSON.stringify(cloudEvent, null, 2));

    const result = await cleanupStaleServices();

    console.log('[CLEANUP] Summary:', JSON.stringify(result, null, 2));
    console.log('[CLEANUP] Job-killer function completed successfully');
  } catch (error) {
    console.error('[CLEANUP] Job-killer function failed:', error);
    throw error; // Re-throw to mark the function execution as failed
  }
});
