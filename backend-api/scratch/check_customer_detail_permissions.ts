import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  const sessions = (vttechApi as any).sessions;
  const customerId = 76380;

  const endpoints = [
    {
      name: 'LoadPaymentInfo',
      page: '/Customer/MainCustomer/',
      handler: 'LoadPaymentInfo',
      data: { CustomerID: customerId }
    },
    {
      name: 'LoadataTab (Services)',
      page: '/Customer/Service/TabList/TabList_Service/',
      handler: 'LoadataTab',
      data: { CustomerID: customerId }
    },
    {
      name: 'LoadataTreatment',
      page: '/Customer/Treatment/TreatmentList/TreatmentList_Service/',
      handler: 'LoadataTreatment',
      data: { CustomerID: customerId, limit: 50 }
    },
    {
      name: 'Loadata (Schedules)',
      page: '/Customer/ScheduleList_Schedule/',
      handler: 'Loadata',
      data: {
        CustomerID: customerId,
        TicketID: 0,
        Limit: 10,
        BeginID: 0,
        BeginDate: 0,
        IsDelete: 0,
        IsCancel: 1,
        IsTemp: 0
      }
    }
  ];

  for (const s of sessions) {
    console.log(`\n==================================================`);
    console.log(`👤 ACCOUNT: ${s.username}`);
    console.log(`==================================================`);
    
    // Login
    try {
      const loggedIn = await vttechApi.login(s);
      if (!loggedIn) {
        console.log(`❌ Login failed`);
        continue;
      }
    } catch (e: any) {
      console.log(`💥 Login failed: ${e.message}`);
      continue;
    }

    for (const ep of endpoints) {
      try {
        console.log(`👉 Testing ${ep.name}...`);
        const res = await vttechApi.callHandler(ep.page, ep.handler, ep.data, s.username);
        if (res === null) {
          console.log(`   ❌ NULL (Permission Denied / Redirected)`);
        } else if (Array.isArray(res)) {
          console.log(`   ✅ Succeeded! Array size: ${res.length}`);
        } else if (typeof res === 'object') {
          const keys = Object.keys(res);
          console.log(`   ✅ Succeeded! Object keys: [${keys.join(', ')}]`);
        } else {
          console.log(`   ❓ Returned type: ${typeof res}`);
        }
      } catch (err: any) {
        console.log(`   💥 Threw error: ${err.message}`);
      }
    }
  }

  await app.close();
}

main().catch(console.error);
