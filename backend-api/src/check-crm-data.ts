import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VttechApiService } from './vttech-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Bootstrapping NestJS context for CRM data check with Branch 1...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  const testDates = [
    '2018-12-31',
    '2019-01-01',
    '2019-01-02'
  ];

  const types = [5, 2, 3];
  
  for (const date of testDates) {
    console.log(`\n--- Checking Branch 1 for date: ${date} ---`);
    for (const type of types) {
      try {
        const res = await vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', {
          dateFrom: date,
          dateTo: date,
          branchID: '1', // Specific branch: Taza Skin Clinic Thủ Đức
          type: type,
          BeginID: 0,
          BeginCustID: 0,
          Limit: 10,
        });

        const items = Array.isArray(res) ? res : [];
        console.log(`Type ${type}: Found ${items.length} items.`);
        if (items.length > 0) {
          console.log('Sample item:', {
            CustID: items[0].CustID || items[0].ID,
            CustName: items[0].CustName || items[0].FullName,
            CreatedDate: items[0].CreatedDate || items[0].CreatedTime,
          });
        }
      } catch (e: any) {
        console.error(`Error checking Type ${type} for date ${date}:`, e.message);
      }
    }
  }

  await app.close();
}

main().catch(console.error);
