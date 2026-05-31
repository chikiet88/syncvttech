import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync.service';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('Bootstrapping NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);
  const prisma = app.get(PrismaClient);

  const branches = await prisma.branch.findMany();
  
  // Build list of dates in April 2026
  const dates: string[] = [];
  const start = new Date('2026-04-01');
  const end = new Date('2026-04-30');
  let curr = new Date(start);
  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  console.log(`Starting fast sync for ${dates.length} days and ${branches.length} branches...`);
  
  for (const dateStr of dates) {
    console.log(`📅 Syncing appointments for date: ${dateStr}...`);
    // Run all branches in parallel for the day (VttechApiService handles locking and session queues internally)
    const promises = branches.map(branch => {
      return (syncService as any).syncAppointments(dateStr, dateStr, branch.id).catch((e: any) => {
        console.error(`  Error syncing branch ${branch.id} on ${dateStr}:`, e.message);
      });
    });
    await Promise.all(promises);
  }

  console.log('Appointments sync completed!');
  await app.close();
}

main().catch(console.error);
