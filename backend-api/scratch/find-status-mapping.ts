import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaService } from '../src/prisma.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const targetBranch = 6;
  const targetDate = '2026-06-17';

  try {
    const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
      DateFrom: targetDate,
      BranchID: targetBranch.toString(),
      AppID: '0',
      StatusID: '0',
      DoctorID: '0',
      TypeApp: '1',
    });
    
    const rawAppointments = Array.isArray(res) ? res : [];
    console.log(`Fetched ${rawAppointments.length} raw appointments.`);

    // Lấy thông tin các appointments này từ DB local
    const dbAppointments = await prisma.appointment.findMany({
      where: {
        id: { in: rawAppointments.map((a: any) => parseInt(a.ID)).filter(Boolean) }
      }
    });

    const dbMap = new Map(dbAppointments.map(a => [a.id, a]));

    // Phân tích
    console.log('\n--- ANALYZING FIELDS FOR STATUS MAPPING ---');
    const stats: Record<string, any> = {};

    for (const raw of rawAppointments) {
      const id = parseInt(raw.ID);
      const dbApp = dbMap.get(id);
      const statusNameInDb = dbApp ? dbApp.status_name : 'NOT_IN_DB';
      
      const key = statusNameInDb || 'null_in_db';
      if (!stats[key]) {
        stats[key] = {
          count: 0,
          states: new Set(),
          typeStatusIDs: new Set(),
          cusIsPayments: new Set(),
          isCancels: new Set(),
          samples: []
        };
      }

      stats[key].count++;
      stats[key].states.add(raw.State);
      stats[key].typeStatusIDs.add(raw.TypeStatusID);
      stats[key].cusIsPayments.add(raw.CusIsPayment);
      stats[key].isCancels.add(raw.IsCancel);
      
      if (stats[key].samples.length < 2) {
        stats[key].samples.push({
          ID: raw.ID,
          CustName: raw.CustName,
          State: raw.State,
          TypeStatusID: raw.TypeStatusID,
          CusIsPayment: raw.CusIsPayment,
          IsCancel: raw.IsCancel,
          Amount: raw.Amount,
          TotalPaid: raw.TotalPaid
        });
      }
    }

    for (const [status, data] of Object.entries(stats)) {
      console.log(`\nStatus in DB: "${status}" (Count: ${data.count})`);
      console.log(`  State values:`, Array.from(data.states));
      console.log(`  TypeStatusID values:`, Array.from(data.typeStatusIDs));
      console.log(`  CusIsPayment values:`, Array.from(data.cusIsPayments));
      console.log(`  IsCancel values:`, Array.from(data.isCancels));
      console.log(`  Samples:`, JSON.stringify(data.samples, null, 2));
    }

  } catch (e: any) {
    console.error(`Error: ${e.message}`);
  }

  await app.close();
}

bootstrap().catch(console.error);
