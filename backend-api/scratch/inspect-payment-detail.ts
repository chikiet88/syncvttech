import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  const targetDate = '2026-06-20';
  const branchId = 1;

  console.log('Testing ittest1 Payment Detail response...');
  const res = await vttechApi.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'LoadataPaymentDetailByBranch', {
    BranchID: branchId.toString(),
    dateFrom: targetDate,
    dateTo: targetDate,
  }, 'ittest1');

  console.log('Type of response:', typeof res);
  if (typeof res === 'string') {
    console.log('Is it HTML? (starts with <):', res.trim().startsWith('<'));
    console.log('First 500 characters of response:');
    console.log(res.slice(0, 500));
  } else {
    console.log('Response content:', JSON.stringify(res).slice(0, 500));
  }

  await app.close();
}

main().catch(console.error);
