import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const targetAppId = 744627;
  const dateStr = '2026-04-03';
  const branchIds = [1, 2, 3, 4, 6, 23, 26];

  for (const bId of branchIds) {
    const res = await vttechApi.callHandler(
      '/Desk/Appointment/AppointmentInDay_Desk_Branch/',
      'LoadataAppointmentList',
      {
        DateFrom: dateStr,
        BranchID: bId.toString(),
        AppID: '0',
        StatusID: '0',
        DoctorID: '0',
        TypeApp: '1',
      },
      'ittest1'
    );
    const items = Array.isArray(res) ? res : (res?.Table || []);
    const found = items.find((x: any) => parseInt(x.ID || x.ScheduleID) === targetAppId);
    if (found) {
      console.log(`Found app ${targetAppId} on branch ${bId}:`);
      console.log(JSON.stringify(found, null, 2));
      break;
    }
  }

  await app.close();
}

main().catch(console.error);
