
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VttechApiService } from './vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const date = '01-01-2020';
  console.log(`Testing Revenue for ALL Branches on ${date}...`);
  
  // Try branch 1 first
  const res = await vttechApi.getRevenueByBranch(date, date, 1);
  console.log('Branch 1 response:', JSON.stringify(res));

  // Try branch 7 (Văn Phòng)
  const res7 = await vttechApi.getRevenueByBranch(date, date, 7);
  console.log('Branch 7 response:', JSON.stringify(res7));

  await app.close();
}

main().catch(console.error);
