import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  console.log('Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  const customerId = 196954;
  console.log(`Logging in and calling API for customer ${customerId}...`);

  const endpoints = [
    { page: '/Customer/GeneralInfo/', handler: 'LoadData', data: { CustomerID: customerId } },
    { page: '/Customer/MainCustomer/', handler: 'LoadPaymentInfo', data: { CustomerID: customerId } },
    { page: '/Customer/Service/TabList/TabList_Card/', handler: 'LoadataCard', data: { CustomerID: customerId, id: 0, limit: 100, beginID: 0 } },
    { page: '/Customer/Service/TabList/TabList_Service/', handler: 'LoadataTab', data: { CustomerID: customerId } },
    { page: '/Customer/Treatment/TreatmentList/TreatmentList_Service/', handler: 'LoadataTreatment', data: { CustomerID: customerId, limit: 100 } },
    { page: '/Customer/ScheduleList_Schedule/', handler: 'Loadata', data: { CustomerID: customerId, IsCancel: 1 } },
  ];

  for (const ep of endpoints) {
    try {
      console.log(`\nCalling ${ep.page}?handler=${ep.handler}...`);
      const start = Date.now();
      const res = await vttechApi.callHandler(ep.page, ep.handler, ep.data);
      console.log(`Success in ${Date.now() - start}ms. Record count: ${Array.isArray(res) ? res.length : (res?.Table ? res.Table.length : 'Object')}`);
    } catch (e: any) {
      console.error(`Error: ${e.message}`);
    }
  }

  await app.close();
}

main().catch(console.error);
