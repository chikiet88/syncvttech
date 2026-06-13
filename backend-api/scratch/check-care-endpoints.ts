import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log('🔄 Logging in...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const customerId = 39002;
  console.log(`\nChecking care history endpoints for customer ${customerId}:`);

  // Endpoint 1: /Customer/History/HistoryList_Care/
  try {
    const res1 = await vttechApi.callHandler(
      '/Customer/History/HistoryList_Care/',
      'LoadataHistory',
      { CustomerID: customerId, limit: 10 }
    );
    console.log(`\n- Endpoint 1 (/Customer/History/HistoryList_Care/ - LoadataHistory) length:`, Array.isArray(res1?.Table || res1) ? (res1?.Table || res1).length : typeof res1);
    console.log('Sample:', JSON.stringify((res1?.Table || res1)?.slice(0, 1), null, 2));
  } catch (e: any) {
    console.error(`- Endpoint 1 Error:`, e.message);
  }

  // Endpoint 2: /Customer/HistoryList_Care/
  try {
    const res2 = await vttechApi.callHandler(
      '/Customer/HistoryList_Care/',
      'LoadataHistory',
      { CustomerID: customerId, limit: 10 }
    );
    console.log(`\n- Endpoint 2 (/Customer/HistoryList_Care/ - LoadataHistory) length:`, Array.isArray(res2?.Table || res2) ? (res2?.Table || res2).length : typeof res2);
    console.log('Sample:', JSON.stringify((res2?.Table || res2)?.slice(0, 1), null, 2));
  } catch (e: any) {
    console.error(`- Endpoint 2 Error:`, e.message);
  }

  // Endpoint 3: /Customer/HistoryList_Care/ with Loadata
  try {
    const res3 = await vttechApi.callHandler(
      '/Customer/HistoryList_Care/',
      'Loadata',
      { CustomerID: customerId, limit: 10 }
    );
    console.log(`\n- Endpoint 3 (/Customer/HistoryList_Care/ - Loadata) length:`, Array.isArray(res3?.Table || res3) ? (res3?.Table || res3).length : typeof res3);
    console.log('Sample:', JSON.stringify((res3?.Table || res3)?.slice(0, 1), null, 2));
  } catch (e: any) {
    console.error(`- Endpoint 3 Error:`, e.message);
  }

  await app.close();
}

test().catch(console.error);
