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

  const targetAppId = 775501;
  const branchId = '6'; 
  const dateStr = '2026-06-15';
  const customerId = '199885';
  
  console.log(`Calling LoadataAppointmentList for branch ${branchId} on ${dateStr}...`);
  try {
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
      }
    );

    const items = Array.isArray(res) ? res : (res?.Table || res?.data || []);
    console.log(`Found ${items.length} appointments on ${dateStr}.`);

    const targetApp = items.find((a: any) => parseInt(a.ID || a.ScheduleID) === targetAppId);

    if (targetApp) {
      console.log('\n=== RAW APPOINTMENT 775501 FROM DAILY LIST ===');
      console.log(JSON.stringify(targetApp, null, 2));
    } else {
      console.log(`Not found appointment ${targetAppId} in daily list.`);
    }
  } catch (e: any) {
    console.error('Error fetching LoadataAppointmentList:', e.message);
  }

  console.log('\n--- Fetching Customer Schedules ---');
  try {
    const resCust = await vttechApi.callHandler(
      '/Customer/ScheduleList_Schedule/',
      'Loadata',
      {
        CustomerID: customerId,
        TicketID: '0',
        Limit: '100',
        BeginID: '0',
        IsDelete: '0',
        IsTemp: '0',
      }
    );
    const itemsCust = Array.isArray(resCust) ? resCust : (resCust?.Table || resCust?.data || []);
    const targetCustApp = itemsCust.find((a: any) => parseInt(a.ID || a.ScheduleID) === targetAppId);
    if (targetCustApp) {
      console.log('\n=== RAW APPOINTMENT 775501 FROM CUSTOMER SCHEDULES ===');
      console.log(JSON.stringify(targetCustApp, null, 2));
    } else {
      console.log('Not found in customer schedules.');
    }
  } catch (e: any) {
    console.error('Error fetching Customer schedules:', e.message);
  }

  await app.close();
}

main().catch(console.error);
