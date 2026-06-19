import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync.service';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('🚀 Bootstrapping NestJS for targeted sync of Nguyễn Thị Hồng Sâm (ID: 118913)...');
  
  // Update updated_at of customer 118913 to bypass the 7 days check
  const prismaDb = new PrismaClient();
  try {
    await prismaDb.customer.update({
      where: { id: 118913 },
      data: { updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }
    });
    console.log('Reset customer 118913 updated_at to 10 days ago.');
  } catch (e) {
    console.log('Customer not found or error resetting updated_at:', e.message);
  } finally {
    await prismaDb.$disconnect();
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);

  // Parent task ID for Đà Nẵng is 294469
  const parentTaskId = 294469;
  const customerId = 118913;

  console.log(`Starting detail sync for Customer ID: ${customerId}...`);
  
  // Directly call the detail sync method
  await syncService.processQueuedCustomerDetail(customerId, parentTaskId);

  console.log('✅ Sync completed! Verifying database record...');
  
  const prisma = (syncService as any).prisma;
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { branch: true }
  });

  if (customer) {
    console.log(`CUSTOMER FOUND IN DB:`);
    console.log(`Name: ${customer.name}`);
    console.log(`Phone: ${customer.phone}`);
    console.log(`Branch: ${customer.branch?.name} (ID: ${customer.branch_id})`);
  } else {
    console.log('Customer NOT found in DB.');
  }

  const appt = await prisma.appointment.findFirst({
    where: { customer_id: customerId },
    include: { branch: true }
  });

  if (appt) {
    console.log(`APPOINTMENT FOUND IN DB:`);
    console.log(`ID: ${appt.id}`);
    console.log(`Branch: ${appt.branch?.name} (ID: ${appt.branch_id})`);
    console.log(`Date: ${appt.appointment_date?.toISOString()}`);
    console.log(`Status: ${appt.status_name}`);
    console.log(`Phone in Appointment: ${appt.phone}`);
    console.log(`Customer Name in Appointment: ${appt.customer_name}`);
  } else {
    console.log('Appointment NOT found in DB.');
  }

  await app.close();
}

main().catch(console.error);
