import { cryptoService } from "@/services/crypto.service";
import { testService } from "@/services/test.service";
import { freadJobs, freadTestRuns, fwriteJobs } from "@/shared/services/resource-locator.service";
import { EmuTestQueueJob } from "@/shared/types/experiments";
import { EmuTestRun } from "@/shared/types/test-run";
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
        const job = await this.claimNextJob();
        
        if (job) {
          console.log(`[Work][Slot ${slotId}] Processing job ${job.id}`);
          await this.executeJob(job);
        } else {
          console.log(`[Work][Slot ${slotId}] Taking a nap...`);
          await this.sleep(10_000 + Math.random() * 1000);
        }
      } catch (error) {
        console.error(`[Work][Slot ${slotId}] Error:`, error);
        await this.sleep(2000);
      }
    }
    console.log(`[Work][Slot ${slotId}] No pending jobs, time to sleep...`);
  }

  async claimNextJob() {
    try {
      const jobs = await freadJobs([['status', '==', 'pending']]);
      console.log(`[Work] Found ${jobs ? jobs.length : 0} pending jobs`);
      if (!jobs || jobs.length === 0) {
        console.log(`[Work] No pending jobs, putting the workers to bed`);
        this.stop();
        return null;
      }
      const jobDoc = jobs[0];

      const success = await fwriteJobs(
        [{ id: jobDoc.id, status: 'running', startedAt: FieldValue.serverTimestamp() }],
        { update: true, atomic: true }
      );
      
      if (success) {
        return jobDoc;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async executeJob(job: EmuTestQueueJob) {
    try {
      this.activeJobs.add(job.id);

      await testService.runTest(job.bootConfig, cryptoService.decrypt(job.encryptedUserToken));

      let result: EmuTestRun | null = null;
      while (!result) {
        try {
          const testRuns = await freadTestRuns(job.bootConfig.testConfig.id);
          if (testRuns && testRuns.length > 0) {
            result = testRuns[0];
            break;
          }
        } catch (error) {
          console.error(`[Work] Error fetching test run for job ${job.id}:`, error);
        }
        await this.sleep(10_000);
      }
      
      await fwriteJobs([{
        id: job.id,
        status: 'completed',
        completedAt: FieldValue.serverTimestamp()
      }], { update: true });
      
      console.log(`[Work] Job ${job.id} completed`);
    } catch (error) {
      console.error(`[Work] Job ${job.id} failed:`, error);
      
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

const testQueueService = new TestQueueService(1);
export { testQueueService };
