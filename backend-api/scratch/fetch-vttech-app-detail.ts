import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  console.log('Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log('Logging in...');
  await vttechApi.login();

  console.log('Calling LoadataAppointmentList for branch 6 on 2026-06-11...');
  const res = await vttechApi.callHandler(
    '/Desk/Appointment/AppointmentInDay_Desk_Branch/',
    'LoadataAppointmentList',
    {
      DateFrom: '2026-06-11',
      BranchID: '6',
      AppID: '0',
      StatusID: '0',
      DoctorID: '0',
      TypeApp: '1',
    }
  );

  const items = Array.isArray(res) ? res : (res?.Table || []);
  console.log(`Found ${items.length} appointments.`);

  const targetApp = items.find((a: any) => parseInt(a.ID || a.ScheduleID) === 775422);

  if (targetApp) {
    console.log('\n=== RAW APPOINTMENT FROM VTTECH ===');
    console.log(JSON.stringify(targetApp, null, 2));
  } else {
    console.log('\nTarget appointment 775422 not found in the list!');
    console.log('All IDs found:', items.map((a: any) => a.ID || a.ScheduleID));
  }

  await app.close();
}

main().catch(console.error);
