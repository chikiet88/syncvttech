
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SyncService } from './sync.service';
import { PrismaService } from './prisma.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);
  const prisma = app.get(PrismaService);

  const dateStr = '2026-04-22';
  console.log(`🚀 Starting DIRECT re-sync for ${dateStr} with Type 2 & 3 support...`);

  const branches = await prisma.branch.findMany({ where: { is_active: 1 } });
  
  for (const branch of branches) {
    console.log(`\n--- Syncing Branch ${branch.id}: ${branch.name} ---`);
    try {
        await syncService.processQueuedRevenueDay(dateStr, branch.id);
        console.log(`✅ Revenue synced for ${branch.name}`);
    } catch (e) {
        console.error(`❌ Error syncing branch ${branch.name}: ${e.message}`);
    }
  }

  console.log('\n🚀 ALL DONE!');
  await app.close();
}

bootstrap().catch(console.error);
