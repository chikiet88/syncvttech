
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SyncService } from './sync.service';

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const sync = app.get(SyncService);

  const dateStart = '2026-04-01';
  const dateEnd = '2026-04-04';
  
  console.log(`🚀 Starting Sweep Sync for all branches from ${dateStart} to ${dateEnd}...`);
  await sync.syncByRange(dateStart, dateEnd);
  console.log('✅ Sweep Sync completed.');
  
  await app.close();
}

test().catch(console.error);
