
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VttechApiService } from './vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const from = '01-02-2019';
  const to = '28-02-2019';
  console.log(`Testing Revenue for Branch 1 from ${from} to ${to}...`);
  
  const res = await vttechApi.getRevenueByBranch(from, to, 1);
  console.log('Response length:', Array.isArray(res) ? res.length : 'Not an array');
  if (Array.isArray(res) && res.length > 0) {
    console.log(`Total items found: ${res.length}`);
    const days = new Set();
    res.forEach(item => days.add(item.Date || item.date || item.RegDate || item.DateCreated));
    console.log('Unique dates with data found:', days.size);
    console.log('Sample dates:', Array.from(days).slice(0, 5));
  } else {
    console.log('Raw response:', JSON.stringify(res));
  }

  await app.close();
}

main().catch(console.error);
