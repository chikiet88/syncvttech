
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VttechApiService } from './vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const from = '01-01-2019';
  const to = '31-01-2019';
  console.log(`Testing Revenue for Branch 7 from ${from} to ${to}...`);
  
  const res = await vttechApi.getRevenueByBranch(from, to, 7);
  console.log('Response length:', Array.isArray(res) ? res.length : 'Not an array');
  if (Array.isArray(res) && res.length > 0) {
    console.log(`Total items found: ${res.length}`);
    const days = new Set();
    res.forEach(item => days.add(item.Date || item.date || item.RegDate));
    console.log('Days with data:', Array.from(days).sort());
  } else {
    console.log('Raw response:', JSON.stringify(res));
  }

  await app.close();
}

main().catch(console.error);
