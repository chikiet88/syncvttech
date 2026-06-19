import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  console.log('Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  const customerId = 175937;
  console.log(`Testing schedule sync for customer ID: ${customerId}`);

  const testParams = [
    {
      name: 'Default params (current codebase)',
      data: { CustomerID: customerId, IsCancel: 1 }
    },
    {
      name: 'Full params (matching Postman/quytrinhsync.md)',
      data: {
        CustomerID: customerId,
        TicketID: 0,
        Limit: 100,
        BeginID: 0,
        BeginDate: 0,
        IsDelete: 0,
        IsCancel: 1,
        IsTemp: 0
      }
    }
  ];

  for (const test of testParams) {
    try {
      console.log(`\nRunning test: ${test.name}`);
      console.log('Parameters:', JSON.stringify(test.data));
      
      const start = Date.now();
      const res = await vttechApi.callHandler('/Customer/ScheduleList_Schedule/', 'Loadata', test.data);
      const elapsed = Date.now() - start;
      
      console.log(`Response received in ${elapsed}ms.`);
      console.log(`Is Array? ${Array.isArray(res)}`);
      if (Array.isArray(res)) {
        console.log(`Record count: ${res.length}`);
        if (res.length > 0) {
          console.log('Sample record:', JSON.stringify(res[0], null, 2));
        }
      } else {
        console.log('Response:', JSON.stringify(res));
      }
    } catch (e: any) {
      console.error(`Error: ${e.message}`);
    }
  }

  await app.close();
}

main().catch(console.error);
