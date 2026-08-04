import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function main() {
  console.log('🚀 Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  try {
    const page = '/Setting/MethodPayment/MethodPaymentList';

    console.log('📡 Calling LoadDataType (Payment Groups)...');
    const resTypes = await vttechApi.callHandler(page, 'LoadDataType', {});
    console.log('LoadDataType response raw type:', typeof resTypes);
    const groups = vttechApi.decompress(resTypes);
    console.log('\n--- PAYMENT GROUPS ---');
    console.log(groups);

    console.log('\n📡 Calling LoadData (Payment Methods)...');
    const resMethods = await vttechApi.callHandler(page, 'LoadData', { id: 0 });
    console.log('LoadData response raw type:', typeof resMethods);
    const methods = vttechApi.decompress(resMethods);
    console.log('\n--- PAYMENT METHODS ---');
    console.log(methods);

    fs.writeFileSync('scratch/payment_groups.json', JSON.stringify(groups, null, 2));
    fs.writeFileSync('scratch/payment_methods.json', JSON.stringify(methods, null, 2));
    console.log('\nSaved scratch/payment_groups.json and scratch/payment_methods.json');

  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }

  await app.close();
}

main().catch(console.error);
