import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const customers = [
    { custId: 194146, appId: 776835, name: 'PHAN THỊ LÝ' },
    { custId: 199909, appId: 775675, name: 'TRÂM NGUYỄN' },
    { custId: 197970, appId: 768903, name: 'ZOE HANKY' }
  ];

  // We will try using 'ittest1' which usually has all permissions
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
        },
        'ittest1'
      );
      const items = Array.isArray(res) ? res : (res?.Table || res?.data || []);
      const match = items.find((x: any) => parseInt(x.ID) === c.appId);
      if (match) {
        console.log(`Found appointment ${c.appId}:`);
        console.log(`  - Date_From: ${match.Date_From}`);
        console.log(`  - StatusName: ${match.StatusName}`);
        console.log(`  - IsCancel: ${match.IsCancel}`);
        console.log(`  - TypeName: ${match.TypeName}`);
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
