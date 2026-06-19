import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SyncService } from './sync.service';
export declare class SyncProcessor extends WorkerHost {
    private readonly syncService;
    private readonly logger;
    constructor(syncService: SyncService);
    process(job: Job<any, any, string>): Promise<any>;
}
