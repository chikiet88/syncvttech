import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const customerId = 200015;
  console.log(`Fetching schedules for customer ${customerId} from ScheduleList_Schedule...`);

  const res = await vttechApi.callHandler(
    '/Customer/ScheduleList_Schedule/',
    'Loadata',
    {
      CustomerID: customerId,
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
  const target = items.find((x: any) => parseInt(x.ID) === 776160);

  if (target) {
    console.log('=== RAW SCHEDULE FROM CUSTOMER SCHEDULE LIST ===');
    console.log(JSON.stringify(target, null, 2));
  } else {
    console.log('Not found in ScheduleList_Schedule');
  }

  await app.close();
}

main().catch(console.error);
