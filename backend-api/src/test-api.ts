
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SyncService } from './sync.service';

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const sync = app.get(SyncService);

  const branches = [1, 2, 3, 4, 5, 6, 7]; // Popular branches
  const dates = ['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04'];

  console.log('--- Sweep Syncing Revenue for April ---');
  for (const date of dates) {
    for (const bId of branches) {
      console.log(`Syncing Branch ${bId} on ${date}...`);
      try {
        await sync.processQueuedRevenueDay(date, bId);
      } catch (e) {
        console.error(`Failed Branch ${bId} on ${date}:`, e.message);
      }
    }
  }

  console.log('✅ Sweep sync finished.');
  await app.close();
}

test().catch(console.error);
