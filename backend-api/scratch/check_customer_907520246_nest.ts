import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  const targetPhone = '0907520246';
  const targetCustId = 200394;
  const targetDate = '2026-06-20';

  console.log('\n--- 1. Searching for Customer on VTTech ---');
  try {
    // Let's call /Customer/ListCustomer?handler=LoadData
    const res = await vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', {
      dateFrom: '2026-06-01 00:00:00',
      dateTo: '2026-06-22 23:59:59',
      branchID: '1',
      type: '0',
      BeginCustID: 0,
      BeginID: 0,
      Limit: 500
    });
    
    const items = Array.isArray(res) ? res : [];
    console.log(`Customer API returned ${items.length} records.`);
    const match = items.find((item: any) => (item.Phone || '').includes(targetPhone) || parseInt(item.ID) === targetCustId);
    if (match) {
      console.log('Found Customer match on VTTech:');
      console.log(JSON.stringify(match, null, 2));
    } else {
      console.log('Customer NOT found in ListCustomer.');
    }
  } catch (e: any) {
    console.error('Error fetching customer:', e.message);
  }

  console.log('\n--- 2. Checking ScheduleList for Customer 200394 ---');
  try {
    const res = await vttechApi.callHandler('/Customer/ScheduleList_Schedule/', 'Loadata', {
      CustomerID: targetCustId,
      TicketID: 0,
      Limit: 100,
      BeginID: 0,
      BeginDate: 0,
      IsDelete: 0,
      IsCancel: 1,
      IsTemp: 0
    });
    
    console.log('Schedule API response:');
    console.log(JSON.stringify(res, null, 2));
  } catch (e: any) {
    console.error('Error fetching schedules:', e.message);
  }

  console.log('\n--- 3. Checking Appointment list for branch 1 on 2026-06-20 ---');
  try {
    const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
      DateFrom: targetDate,
      BranchID: '1',
      AppID: '0',
      StatusID: '0',
      DoctorID: '0',
      TypeApp: '1',
    });
    
    const items = Array.isArray(res) ? res : [];
    console.log(`Appointment list returned ${items.length} records.`);
    const match = items.find((item: any) => parseInt(item.ID) === 778028 || (item.Phone || '').includes(targetPhone));
    if (match) {
      console.log('Found Appointment match in day list on VTTech:');
      console.log(JSON.stringify(match, null, 2));
    } else {
      console.log('Appointment NOT found in day list on VTTech.');
    }
  } catch (e: any) {
    console.error('Error fetching day appointments:', e.message);
  }

  await app.close();
}

main().catch(console.error);
