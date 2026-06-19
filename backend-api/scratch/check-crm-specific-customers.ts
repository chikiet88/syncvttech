import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const customers = [
    { custId: 199444, appId: 773746, name: 'NGUYỄN THỊ CÚC' },
    { custId: 171395, appId: 777231, name: 'NGUYỄN KHỔNG MINH ĐOAN' },
    { custId: 194146, appId: 776835, name: 'PHAN THỊ LÝ' },
    { custId: 200132, appId: 776828, name: 'PHẠM NGỌC MINH NGÂN' },
    { custId: 199909, appId: 775675, name: 'TRÂM NGUYỄN' },
    { custId: 197970, appId: 768903, name: 'ZOE HANKY' }
  ];

  for (const c of customers) {
    console.log(`\n=== Customer: ${c.name} (${c.custId}) ===`);
    try {
      const res = await vttechApi.callHandler(
        '/Customer/ScheduleList_Schedule/',
        'Loadata',
        {
          CustomerID: c.custId,
          TicketID: 0,
          Limit: 100,
          BeginID: 0,
          BeginDate: 0,
          IsDelete: 0,
          IsCancel: 1,
          IsTemp: 0
        }
      );
      const items = Array.isArray(res) ? res : (res?.Table || res?.data || []);
      const match = items.find((x: any) => parseInt(x.ID) === c.appId);
      if (match) {
        console.log(`Found appointment ${c.appId}:`);
        console.log(`  - Date_From: ${match.Date_From}`);
        console.log(`  - StatusName: ${match.StatusName}`);
        console.log(`  - IsCancel: ${match.IsCancel}`);
        console.log(`  - TypeName: ${match.TypeName}`);
        console.log(`  - ServiceName: ${match.ServiceName}`);
      } else {
        console.log(`Appointment ${c.appId} not found in customer schedule list.`);
      }
    } catch (e: any) {
      console.error(`Failed to fetch for customer ${c.custId}: ${e.message}`);
    }
  }

  await app.close();
}

main().catch(console.error);
