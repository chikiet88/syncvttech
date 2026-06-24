import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VttechApiService } from './vttech-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Bootstrapping NestJS context for CRM total check...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  try {
    const res = await vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', {
      dateFrom: '2018-01-01',
      dateTo: '2026-06-19',
      branchID: '0',
      type: 5,
      BeginID: 0,
      BeginCustID: 0,
      Limit: 1,
    });

    console.log('CRM LoadData Response keys:', Object.keys(res || {}));
    if (res) {
      console.log('CRM LoadData Response sample/total details:', {
        length: Array.isArray(res) ? res.length : 'Not array',
        total: res.Total || res.recordsTotal || res.total || 'None',
      });
    }
  } catch (e: any) {
    console.error('Error checking CRM total:', e.message);
  }

  await app.close();
}

main().catch(console.error);
