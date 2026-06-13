import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaClient } from '@prisma/client';

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:postgres@localhost:12003/db_tazagroup_vttech_sync"
      }
    }
  });

  console.log('🔄 Logging in...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const start = new Date('2026-06-01T00:00:00.000Z');
  const end = new Date('2026-06-01T23:59:59.999Z');

  const dailyCusts = await prisma.dailyCustomer.findMany({
    where: { date: { gte: start, lte: end } }
  });

  const customerIds = [...new Set(dailyCusts.map(c => c.customer_id))].slice(0, 30); // check first 30 customers
  console.log(`Checking treatment plans and care history for ${customerIds.length} customers...`);

  for (const customerId of customerIds) {
    try {
      const res = await vttechApi.callHandler(
        '/Customer/Service/TabList/TabList_Service/',
        'LoadataTab',
        { CustomerID: customerId }
      );
      
      const table1 = res?.Table1 || [];
      const table = res?.Table || [];
      
      const careRes = await vttechApi.callHandler(
        '/Customer/History/HistoryList_Care/',
        'LoadataHistory',
        { CustomerID: customerId, limit: 100 }
      );
      const careItems = careRes?.Table || careRes || [];

      if (table1.length > 0 || table.length > 0 || careItems.length > 0) {
        console.log(`Customer ${customerId}:`);
        if (table1.length > 0) console.log(`  - Table1 (Plans) count: ${table1.length}`);
        if (table.length > 0) console.log(`  - Table (Services) count: ${table.length}`);
        if (careItems.length > 0) console.log(`  - Care History count: ${careItems.length}`);
      }
    } catch (e: any) {
      console.log(`Error checking customer ${customerId}: ${e.message}`);
    }
  }

  await prisma.$disconnect();
  await app.close();
}

test().catch(console.error);
