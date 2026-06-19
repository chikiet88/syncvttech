import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync.service';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('🚀 Bootstrapping NestJS for future appointments sync test...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);
  const prisma = new PrismaClient();

  try {
    const days = 3;
    console.log(`Starting sync of future appointments for the next ${days} days...`);
    
    // Explicitly run the future appointments sync method
    await syncService.syncFutureAppointments(days);

    console.log('\n--- VERIFYING DATABASE RECORDS ---');
    const today = new Date();
    
    for (let i = 1; i <= days; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const count = await prisma.appointment.count({
        where: {
          appointment_date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      console.log(`📅 Date: ${dateStr} - Found ${count} appointments in Database.`);
      
      if (count > 0) {
        const sampleAppts = await prisma.appointment.findMany({
          where: {
            appointment_date: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          take: 3,
          include: { branch: true }
        });
        
        console.log('Sample appointments:');
        sampleAppts.forEach(a => {
          console.log(`  - [ID: ${a.id}] Branch: ${a.branch?.name || a.branch_name} | Customer: ${a.customer_name} | Phone: ${a.phone} | Status: ${a.status_name}`);
        });
      }
    }

  } catch (error: any) {
    console.error('Test execution failed:', error.message);
  } finally {
    await prisma.$disconnect();
    await app.close();
    console.log('Context closed.');
  }
}

main().catch(console.error);
