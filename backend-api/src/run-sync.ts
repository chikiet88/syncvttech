
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SyncService } from './sync.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);
  
  const today = '2026-04-07';
  console.log(`Starting sync for ${today}...`);
  await syncService.syncByRange(today, today, false, false, true);
  console.log('Sync finished!');
  
  await app.close();
}

main().catch(console.error);
