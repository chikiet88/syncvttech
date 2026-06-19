import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  console.log('Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log('Logging in...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const targetAppId = 776160;
  const branchId = '4'; // Taza Skin Clinic Nha Trang
  
  // Thử tìm trong ngày 13 và ngày 14 tháng 6
  const dates = ['2026-06-13', '2026-06-14'];
  let found = false;

  for (const dateStr of dates) {
    console.log(`Calling LoadataAppointmentList for branch ${branchId} on ${dateStr}...`);
    const res = await vttechApi.callHandler(
      '/Desk/Appointment/AppointmentInDay_Desk_Branch/',
      'LoadataAppointmentList',
      {
        DateFrom: dateStr,
        BranchID: branchId,
        AppID: '0',
        StatusID: '0',
        DoctorID: '0',
        TypeApp: '1',
      },
      'ittest1'
    );

    const items = Array.isArray(res) ? res : (res?.Table || res?.data || []);
    console.log(`Found ${items.length} appointments on ${dateStr}.`);

    const targetApp = items.find((a: any) => parseInt(a.ID || a.ScheduleID) === targetAppId);

    if (targetApp) {
      console.log('\n=== RAW APPOINTMENT 776160 FROM VTTECH ===');
      console.log(JSON.stringify(targetApp, null, 2));
      found = true;
      break;
    }
  }

  if (!found) {
    console.log(`Not found appointment ${targetAppId} on branch ${branchId} for dates:`, dates);
  }

  await app.close();
}

main().catch(console.error);
