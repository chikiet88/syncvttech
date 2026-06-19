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

  const branchIds = [14, 15, 16, 17, 18, 21, 22, 25];
  const dates = ['2026-06-14', '2026-06-15'];
  
  for (const dateStr of dates) {
    console.log(`\n=== DATE: ${dateStr} ===`);
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
          items.forEach((item: any) => {
            console.log(`  - AppID: ${item.ID || item.ScheduleID}, Cust: ${item.CustName || item.CustomerName}, Service: ${item.ServiceName}, Type: ${item.TypeName}, Status: ${item.StatusName}, IsCancel: ${item.IsCancel}, ReasonCancel: ${item.ReasonCancel}, State: ${item.State}`);
          });
        }
      } catch (e: any) {
        console.error(`Branch ${branchId} failed: ${e.message}`);
      }
    }
  }
  await app.close();
}

main().catch(console.error);
