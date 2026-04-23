
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VttechApiService } from './vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const date = '31-12-2023';
  console.log(`Testing Revenue for Branch 1 on ${date}...`);
  
  const res = await vttechApi.getRevenueByBranch(date, date, 1);
  console.log('Branch 1 response items:', Array.isArray(res) ? res.length : 'Not an array');
  if (Array.isArray(res) && res.length > 0) {
     console.log('Sample item:', JSON.stringify(res[0]));
  } else {
     console.log('Raw response:', JSON.stringify(res));
  }

  await app.close();
}

main().catch(console.error);
