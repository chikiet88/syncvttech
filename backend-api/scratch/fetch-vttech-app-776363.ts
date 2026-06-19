import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  console.log('Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log('Logging in...');
  await vttechApi.login();

  console.log('Calling LoadataAppointmentList for branch 6 on 2026-06-13...');
  const res = await vttechApi.callHandler(
    '/Desk/Appointment/AppointmentInDay_Desk_Branch/',
    'LoadataAppointmentList',
    {
      DateFrom: '2026-06-13',
      BranchID: '6',
      AppID: '0',
      StatusID: '0',
      DoctorID: '0',
      TypeApp: '1',
    }
  );

  const items = Array.isArray(res) ? res : (res?.Table || []);
  console.log(`Found ${items.length} appointments.`);

  const targetApp = items.find((a: any) => parseInt(a.ID || a.ScheduleID) === 776363);

  if (targetApp) {
    console.log('\n=== RAW APPOINTMENT 776363 FROM VTTECH ===');
    console.log(JSON.stringify(targetApp, null, 2));
  } else {
    console.log('\nTarget appointment 776363 not found on 2026-06-13. Let\'s try 2026-06-14...');
    const res14 = await vttechApi.callHandler(
      '/Desk/Appointment/AppointmentInDay_Desk_Branch/',
      'LoadataAppointmentList',
      {
        DateFrom: '2026-06-14',
        BranchID: '6',
        AppID: '0',
        StatusID: '0',
        DoctorID: '0',
        TypeApp: '1',
      }
    );
    const items14 = Array.isArray(res14) ? res14 : (res14?.Table || []);
    console.log(`Found ${items14.length} appointments on 14th.`);
    const targetApp14 = items14.find((a: any) => parseInt(a.ID || a.ScheduleID) === 776363);
    if (targetApp14) {
      console.log('\n=== RAW APPOINTMENT 776363 FROM VTTECH (14th) ===');
      console.log(JSON.stringify(targetApp14, null, 2));
    } else {
      console.log('Not found on 14th either.');
    }
  }

  await app.close();
}

main().catch(console.error);
