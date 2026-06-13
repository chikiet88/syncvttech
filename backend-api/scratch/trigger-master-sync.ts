import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync.service';

async function main() {
  console.log('Bootstrapping NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  console.log('Resolving SyncService...');
  const syncService = app.get(SyncService);
  
  const todayStr = '2026-06-13';
  console.log(`Starting sync for ${todayStr} with forceMaster=true to update service groups...`);
  
  // syncByRange(dateFrom, dateTo, forceMaster, syncPbx, syncDetails)
  await syncService.syncByRange(todayStr, todayStr, true, false, false);
  console.log('Sync completed successfully!');
  
  await app.close();
}

main().catch(err => {
  console.error('Master sync failed:', err);
  process.exit(1);
});
