import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  const sessions = (vttechApi as any).sessions;
  console.log(`Checking ${sessions.length} accounts...`);

  const targetDate = '2026-06-20';
  const branchId = 1;

  for (const s of sessions) {
    console.log(`\n--- Checking account: ${s.username} ---`);
    try {
      const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
        DateFrom: targetDate,
        BranchID: branchId.toString(),
        AppID: '0',
        StatusID: '0',
        DoctorID: '0',
        TypeApp: '1',
      }, s.username);

      if (res === null) {
        console.log(`❌ Account ${s.username} returned NULL (likely Permission Denied / Redirected).`);
      } else if (Array.isArray(res)) {
        console.log(`✅ Account ${s.username} succeeded! Returned ${res.length} appointments.`);
      } else {
        console.log(`❓ Account ${s.username} returned type: ${typeof res}`, res);
      }
    } catch (e: any) {
      console.log(`💥 Account ${s.username} threw error: ${e.message}`);
    }
  }

  await app.close();
}

main().catch(console.error);
