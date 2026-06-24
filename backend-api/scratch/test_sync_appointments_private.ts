import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync.service';
import { PrismaService } from '../src/prisma.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);
  const prisma = app.get(PrismaService);

  const targetDate = '2026-06-20';
  const branchId = 1;

  console.log(`\n--- Running syncAppointments for ${targetDate}, Branch ${branchId} ---`);
  try {
    const customerIds = await (syncService as any).syncAppointments(targetDate, targetDate, branchId);
    console.log('✅ syncAppointments completed.');
    console.log(`Returned customer IDs count: ${customerIds.length}`);
    
    // Check if the target appointment 778028 exists and what its status is
    const appt = await prisma.appointment.findUnique({
      where: { id: 778028 }
    });
    console.log('\nAppointment record in database:');
    console.log(JSON.stringify(appt, null, 2));

    const cust = await prisma.customer.findUnique({
      where: { id: 200394 }
    });
    console.log('\nCustomer record in database:');
    console.log(JSON.stringify(cust, null, 2));
  } catch (e: any) {
    console.error('❌ Error executing syncAppointments:', e);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
