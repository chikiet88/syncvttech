import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  const targetDate = '2026-06-20';
  const branchId = 1;

  try {
    // 1. Fetch from VTTech API
    const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
      DateFrom: targetDate,
      BranchID: branchId.toString(),
      AppID: '0',
      StatusID: '0',
      DoctorID: '0',
      TypeApp: '1',
    });
    
    const apiItems = Array.isArray(res) ? res : [];
    console.log(`\nAPI returned ${apiItems.length} appointments for branch ${branchId} on ${targetDate}.`);
    
    // 2. Fetch from local DB
    const dbItems = await prisma.appointment.findMany({
      where: {
        branch_id: branchId,
        appointment_date: {
          gte: new Date(`${targetDate}T00:00:00.000Z`),
          lte: new Date(`${targetDate}T23:59:59.999Z`),
        }
      }
    });
    console.log(`DB has ${dbItems.length} appointments for branch ${branchId} on ${targetDate}.`);

    const apiIds = new Set(apiItems.map(item => parseInt(item.ID)));
    const dbIds = new Set(dbItems.map(item => item.id));

    console.log(`\nAPI IDs count: ${apiIds.size}`);
    console.log(`DB IDs count: ${dbIds.size}`);

    // Check intersection
    const inApiButNotDb = [...apiIds].filter(id => !dbIds.has(id));
    const inDbButNotApi = [...dbIds].filter(id => !apiIds.has(id));

    console.log(`\nAppointments in API but not DB (${inApiButNotDb.length}):`, inApiButNotDb);
    console.log(`Appointments in DB but not API (${inDbButNotApi.length}):`, inDbButNotApi);

    // Let's print details of some inDbButNotApi
    if (inDbButNotApi.length > 0) {
      const details = await prisma.appointment.findMany({
        where: { id: { in: inDbButNotApi.slice(0, 5) } }
      });
      console.log('\nDetails of some appointments in DB but not API:');
      details.forEach(d => {
        console.log(`ID: ${d.id} | Name: ${d.customer_name} | Status: ${d.status_name} | Updated: ${d.updated_at.toISOString()}`);
      });
    }

    // Let's print details of 778028 in API
    const app778028 = apiItems.find((item: any) => parseInt(item.ID) === 778028);
    if (app778028) {
      console.log('\nAppointment 778028 in API:');
      console.log(JSON.stringify(app778028, null, 2));
    } else {
      console.log('\nAppointment 778028 is NOT in API!');
    }

  } catch (e: any) {
    console.error('Error:', e.message);
  }

  await prisma.$disconnect();
  await app.close();
}

main().catch(console.error);
