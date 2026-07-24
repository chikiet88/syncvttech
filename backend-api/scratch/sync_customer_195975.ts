import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);
  console.log(`🚀 Starting manual sync for customer 195975...`);
  await syncService.processQueuedCustomerDetail(195975);
  console.log('✅ ALL DONE!');
  await app.close();
}

bootstrap().catch(console.error);
