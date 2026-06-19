import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log('Logging in...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const customerId = 118913;
  console.log(`Calling GeneralInfo for Customer ID: ${customerId}`);
  const res = await vttechApi.callHandler('/Customer/GeneralInfo/', 'Loadata', { CustomerID: customerId });
  console.log('Response:', JSON.stringify(res, null, 2));

  await app.close();
}

main().catch(console.error);
