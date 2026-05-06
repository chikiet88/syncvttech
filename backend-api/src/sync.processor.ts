import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SyncService } from './sync.service';

@Processor('sync-queue', { 
  concurrency: 4,
  lockDuration: 3600000, // 1 hour
  stalledInterval: 60000, // 1 minute
  maxStalledCount: 3
})
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(private readonly syncService: SyncService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { type, data } = job.data;
    this.logger.log(`Processing job ${job.id} of type ${type}`);

    try {
      switch (type) {
        case 'sync-customer-detail':
          return await this.syncService.processQueuedCustomerDetail(data.customerId, data.parentTaskId);
        
        case 'sync-revenue-day':
          return await this.syncService.processQueuedRevenueDay(data.date, data.branchId);

        case 'sync-task':
          return await this.syncService.processQueuedSyncTask(data.taskId);

        default:
          this.logger.warn(`Unknown job type: ${type}`);
          return;
      }
    } catch (error) {
      this.logger.error(`Failed to process job ${job.id}: ${error.message}`);
      throw error; // Let BullMQ handle retry
    }
  }
}
