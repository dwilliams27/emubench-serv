import { cryptoService } from "@/services/crypto.service";
import { sessionService } from "@/services/session.service";
import { testService } from "@/services/test.service";
import { fattemptClaimJob, fmarkJobComplete, freadJobs, freadTestResults, fwriteJobs } from "@/shared/services/resource-locator.service";
import { EmuTestQueueJob } from "@/shared/types/experiments";
import { EmuTestResult } from "@/shared/types/test-result";
import { FieldValue } from "firebase-admin/firestore";

export class TestQueueService {
  isRunning = false;
  concurrency: number;
  activeJobs: Set<string> = new Set();

  constructor(concurrency = 3) {
    this.concurrency = concurrency;
  }

  async start() {
    this.isRunning = true;
    console.log(`[Work] Task queue workers started`);
    
    let workers = [];
    for (let i = 0; i < this.concurrency; i++) {
      workers.push(this.processLoop(i));
    }
    await Promise.all(workers);
  }

  async processLoop(slotId: number) {
    console.log(`[Work][Slot ${slotId}] Worker reporting for duty`);
    while (this.isRunning) {
      try {
        const job = await this.claimNextJob(slotId);
        
        if (job) {
          console.log(`[Work][Slot ${slotId}] Processing job ${job.id}`);
          await this.executeJob(job, slotId);
        } else {
          await this.sleep(10_000 + Math.random() * 1000);
        }
      } catch (error) {
        console.error(`[Work][Slot ${slotId}] Error:`, error);
        await this.sleep(2000);
      }
    }
    console.log(`[Work][Slot ${slotId}] No pending jobs, time to sleep...`);
  }

  async claimNextJob(slotId: number) {
    try {
      const jobs = await freadJobs([], { where: [['status', '==', 'pending']] }) as EmuTestQueueJob[];
      if (!jobs || jobs.length === 0) {
        console.log(`[Work][Slot ${slotId}] No pending jobs, putting the workers to bed`);
        this.stop();
        return null;
      }
      const jobId = jobs[0].id;
      const claimedJob = await fattemptClaimJob(jobId);
      if (claimedJob) {
        return claimedJob;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async executeJob(job: EmuTestQueueJob, slotId: number) {
    console.log(`[Work][Slot ${slotId}] Executing job ${job.id}`);
    try {
      this.activeJobs.add(job.id);

      const decryptedToken = cryptoService.decrypt(job.encryptedUserToken);
      const test = await testService.runTest(job.bootConfig, decryptedToken);

      let session = sessionService.getSession(decryptedToken);
      if (!session) {
        session = sessionService.createSession(decryptedToken);
      }
      session.activeTests[job.bootConfig.emulatorConfig.id] = test;

      let result: EmuTestResult | null = null;
      while (!result) {
        try {
          const testResults = await freadTestResults([job.bootConfig.emulatorConfig.id]);
          if (testResults && testResults.length > 0) {
            result = testResults[0];
            break;
          }
        } catch (error) {
          console.error(`[Work][Slot ${slotId}] Error fetching test run for job ${job.id}:`, error);
        }
        await this.sleep(10_000);
      }

      await fmarkJobComplete(job.id, job.bootConfig.experimentId!, result);
      
      console.log(`[Work][Slot ${slotId}] Job ${job.id} completed`);
    } catch (error) {
      console.error(`[Work][Slot ${slotId}] Job ${job.id} failed:`, error);
      
      // TODO: retry logic
      await fwriteJobs([{
        id: job.id,
        status: 'error',
        error: (error instanceof Error) ? error.message : 'Unknown error',
        completedAt: FieldValue.serverTimestamp()
      }], { update: true });
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    this.isRunning = false;
    console.log(`[Work] Stopping workers...`);
  }
}

const testQueueService = new TestQueueService(20);
export { testQueueService };
