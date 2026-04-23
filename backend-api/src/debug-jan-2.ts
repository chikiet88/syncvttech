
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VttechApiService } from './vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const date = '02-01-2019'; // DD-MM-YYYY as expected by some endpoints or our parser
  console.log(`Testing Revenue for Branch 7 on ${date}...`);
  
  const res = await vttechApi.getRevenueByBranch(date, date, 7);
  console.log('Response length:', Array.isArray(res) ? res.length : 'Not an array');
  if (Array.isArray(res) && res.length > 0) {
    console.log('First item:', JSON.stringify(res[0]));
  } else {
    console.log('Raw response:', JSON.stringify(res));
  }

  await app.close();
}

main().catch(console.error);
