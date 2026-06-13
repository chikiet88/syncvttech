import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log('🔄 Logging in...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const customerIds = [198615, 191315];
  for (const customerId of customerIds) {
    console.log(`\n======================================================`);
    console.log(`📡 FETCHING DETAILS FOR CUSTOMER ${customerId}`);
    console.log(`======================================================`);
    
    // 1. Treatment Plans (Chẩn đoán - LoadataTab)
    try {
      const res = await vttechApi.callHandler(
        '/Customer/Service/TabList/TabList_Service/',
        'LoadataTab',
        { CustomerID: customerId }
      );
      console.log(`\n- LoadataTab Response (Table1):`, JSON.stringify(res?.Table1 || res, null, 2));
      console.log(`\n- LoadataTab Response (Table):`, JSON.stringify(res?.Table || [], null, 2));
    } catch (e: any) {
      console.error(`- LoadataTab Error:`, e.message);
    }

    // 2. Treatment Plans (Chẩn đoán - LoadataTab_Plan)
    try {
      const res = await vttechApi.callHandler(
        '/Customer/Service/TabList/TabList_Service/',
        'LoadataTab_Plan',
        { CustomerID: customerId }
      );
      console.log(`\n- LoadataTab_Plan Response (keys):`, Object.keys(res || {}));
      if (res?.Table1) {
        console.log(`- LoadataTab_Plan Table1:`, JSON.stringify(res.Table1, null, 2));
      }
      if (res?.Table) {
        console.log(`- LoadataTab_Plan Table:`, JSON.stringify(res.Table, null, 2));
      }
    } catch (e: any) {
      console.error(`- LoadataTab_Plan Error:`, e.message);
    }
  }

  await app.close();
}

test().catch(console.error);
