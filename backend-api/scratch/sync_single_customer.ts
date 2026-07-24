import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const customerId = parseInt(process.argv[2]);
  if (isNaN(customerId)) {
    console.error('❌ Please provide a valid Customer ID as an argument.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);
  console.log(`🚀 Starting manual sync for customer ${customerId}...`);
  await syncService.processQueuedCustomerDetail(customerId);
  console.log('✅ ALL DONE!');
  await app.close();
}

bootstrap().catch(console.error);
