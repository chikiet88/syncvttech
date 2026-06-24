import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  const sessions = (vttechApi as any).sessions;
  console.log(`Checking ${sessions.length} accounts...`);

  const targetDate = '2026-06-20';
  const branchId = 1;

  const endpoints = [
    {
      name: 'Customer List (LoadData)',
      page: '/Customer/ListCustomer/',
      handler: 'LoadData',
      data: {
        dateFrom: targetDate,
        dateTo: targetDate,
        branchID: branchId.toString(),
        type: 5,
        BeginID: 0,
        BeginCustID: 0,
        Limit: 10,
      }
    },
    {
      name: 'Appointment List (LoadataAppointmentList)',
      page: '/Desk/Appointment/AppointmentInDay_Desk_Branch/',
      handler: 'LoadataAppointmentList',
      data: {
        DateFrom: targetDate,
        BranchID: branchId.toString(),
        AppID: '0',
        StatusID: '0',
        DoctorID: '0',
        TypeApp: '1',
      }
    },
    {
      name: 'Revenue Detail (LoadataDetailByBranch)',
      page: '/Report/Revenue/Branch/AllBranchGrid/',
      handler: 'LoadataDetailByBranch',
      data: {
        BranchID: branchId.toString(),
        dateFrom: targetDate,
        dateTo: targetDate,
      }
    },
    {
      name: 'Payment Detail (LoadataPaymentDetailByBranch)',
      page: '/Report/Revenue/Branch/AllBranchGrid/',
      handler: 'LoadataPaymentDetailByBranch',
      data: {
        BranchID: branchId.toString(),
        dateFrom: targetDate,
        dateTo: targetDate,
      }
    },
    {
      name: 'Deposit Detail (LoadataDepositDetailByBranch)',
      page: '/Report/Revenue/Branch/AllBranchGrid/',
      handler: 'LoadataDepositDetailByBranch',
      data: {
        BranchID: branchId.toString(),
        dateFrom: targetDate,
        dateTo: targetDate,
      }
    }
  ];

  for (const s of sessions) {
    console.log(`\n==================================================`);
    console.log(`👤 ACCOUNT: ${s.username}`);
    console.log(`==================================================`);
    
    // Login first
    try {
      const loggedIn = await vttechApi.login(s, true);
      console.log(`🔑 Login status: ${loggedIn ? 'SUCCESS' : 'FAILED'}`);
      if (!loggedIn) continue;
      
      const xsrf = await vttechApi.getXsrfToken(s, '/Customer/ListCustomer/', true);
      console.log(`🎫 XSRF token: ${xsrf ? 'OK' : 'NULL'}`);
    } catch (loginErr: any) {
      console.log(`💥 Login failed: ${loginErr.message}`);
      continue;
    }

    for (const ep of endpoints) {
      try {
        console.log(`👉 Testing EP: ${ep.name}...`);
        const res = await vttechApi.callHandler(ep.page, ep.handler, ep.data, s.username);
        
        if (res === null) {
          console.log(`   ❌ NULL (Permission Denied / Redirected)`);
        } else if (Array.isArray(res)) {
          console.log(`   ✅ Succeeded! Returned array of ${res.length} items.`);
        } else if (typeof res === 'object') {
          // Check if it has Table, data, etc.
          const keys = Object.keys(res);
          const hasTable = !!(res.Table || res.data || res.Data || res.Items || res.Table1 || res.dtMain);
          console.log(`   ✅ Succeeded! Returned object with keys: [${keys.join(', ')}]. Has array wrapper: ${hasTable}`);
        } else {
          console.log(`   ❓ Returned type: ${typeof res}`);
        }
      } catch (e: any) {
        console.log(`   💥 Threw error: ${e.message}`);
      }
    }
  }

  await app.close();
}

main().catch(console.error);
