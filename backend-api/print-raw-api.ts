import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { VttechApiService } from './src/vttech-api.service';

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log('🔄 Logging in...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const customerIds = [198445];
  
  for (const customerId of customerIds) {
    console.log(`\n======================================================`);
    console.log(`📡 FETCHING DETAILS FOR CUSTOMER ${customerId}`);
    console.log(`======================================================`);
    
    // 1. Anamnesis (Tiền sử)
    try {
      const anamnesis = await vttechApi.callHandler(
        '/Customer/Anamnesis/CustomerAnamnesisList/',
        'LoadataPatientHistory',
        { CustomerID: customerId }
      );
      console.log(`\n- Anamnesis (Tiền sử):`, JSON.stringify(anamnesis, null, 2));
    } catch (e) {
      console.error(`- Anamnesis Error:`, e.message);
    }

    // 2. Care History (Lịch sử chăm sóc/tư vấn)
    try {
      const care = await vttechApi.callHandler(
        '/Customer/History/HistoryList_Care/',
        'LoadataHistory',
        { CustomerID: customerId, limit: 100 }
      );
      console.log(`\n- Care History (Tư vấn):`, JSON.stringify(care, null, 2));
    } catch (e) {
      console.error(`- Care History Error:`, e.message);
    }

    // 3. Complaints (Khiếu nại)
    try {
      const complaints = await vttechApi.callHandler(
        '/Customer/ComplaintList/',
        'Loadata',
        { CustomerID: customerId }
      );
      console.log(`\n- Complaints (Khiếu nại):`, JSON.stringify(complaints, null, 2));
    } catch (e) {
      console.error(`- Complaints Error:`, e.message);
    }

    // 4. Treatment Plans (Chẩn đoán)
    try {
      const res = await vttechApi.callHandler(
        '/Customer/Service/TabList/TabList_Service/',
        'LoadataTab',
        { CustomerID: customerId }
      );
      console.log(`\n- LoadataTab Response (Table1):`, JSON.stringify(res?.Table1 || res, null, 2));
    } catch (e) {
      console.error(`- LoadataTab Error:`, e.message);
    }

    // 4.2. Alternative Treatment Plans (LoadData)
    try {
      const plans2 = await vttechApi.callHandler(
        '/Customer/Plan/',
        'LoadData',
        { CustomerID: customerId }
      );
      console.log(`\n- Treatment Plans (/Customer/Plan/ - LoadData):`, JSON.stringify(plans2, null, 2));
    } catch (e) {
      console.error(`- Treatment Plans LoadData Error:`, e.message);
    }
  }

  await app.close();
}

test();
