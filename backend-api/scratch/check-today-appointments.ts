import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  console.log('Bootstrapping NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log('Logging in...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const branchIds = [1, 2, 3, 4, 6, 14, 15, 16, 17, 18, 22, 23, 25, 26];
  const dateStr = '2026-06-16';
  
  console.log(`\nChecking appointments on CRM for date: ${dateStr}`);
  
  for (const branchId of branchIds) {
    try {
      const res = await vttechApi.callHandler(
        '/Desk/Appointment/AppointmentInDay_Desk_Branch/',
        'LoadataAppointmentList',
        {
          DateFrom: dateStr,
          BranchID: branchId.toString(),
          AppID: '0',
          StatusID: '0',
          DoctorID: '0',
          TypeApp: '1',
        }
      );
      
      const items = Array.isArray(res) ? res : (res?.Table || res?.data || []);
      if (items.length > 0) {
        console.log(`Branch ${branchId}: Found ${items.length} appointments on CRM.`);
        // Print the first appointment as a sample
        console.log('Sample:', JSON.stringify(items[0], null, 2));
      } else {
        console.log(`Branch ${branchId}: 0 appointments on CRM.`);
      }
    } catch (e: any) {
      console.error(`Branch ${branchId} failed: ${e.message}`);
    }
  }

  await app.close();
}

main().catch(console.error);
