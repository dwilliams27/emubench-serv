import { testService } from "@/services/test.service";
import { freadJobs, freadTestRun, freadTestRuns, fwriteJob } from "@/shared/services/resource-locator.service";
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
    
    const workers = Array(this.concurrency).map((_, i) => this.processLoop(i));
    await Promise.all(workers);
  }

  async processLoop(slotId: number) {
    while (this.isRunning) {
      try {
        const job = await this.claimNextJob();
        
        if (job) {
          console.log(`[Work][Slot ${slotId}] Processing job ${job.id}`);
          await this.executeJob(job);
        } else {
          await this.sleep(10_000 + Math.random() * 1000);
        }
      } catch (error) {
        console.error(`[Work][Slot ${slotId}] Error:`, error);
        await this.sleep(2000);
      }
    }
  }

  async claimNextJob() {
    try {
      const jobs = await freadJobs([['status', '==', 'pending']]);
      if (!jobs || jobs.length === 0) {
        return null;
      }
      const jobDoc = jobs[0];

      const success = await fwriteJob(
        { ...jobDoc, status: 'running', startedAt: FieldValue.serverTimestamp() },
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

      // TODO: auth
      testService.runTest(job.bootConfig, );
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
        await this.sleep(5_000);
      }
      
      await fwriteJob({
        ...job,
        status: 'completed',
        result,
        completedAt: FieldValue.serverTimestamp()
      });
      
      console.log(`[Work] Job ${job.id} completed`);
    } catch (error) {
      console.error(`[Work] Job ${job.id} failed:`, error);
      
      // TODO: retry logic
      await fwriteJob({
        ...job,
        status: 'error',
        error: (error instanceof Error) ? error.message : 'Unknown error',
        completedAt: FieldValue.serverTimestamp()
      });
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
