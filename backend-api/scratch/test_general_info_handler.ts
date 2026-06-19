import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const customerId = 118913;

  console.log('Testing handler: LoadData...');
  const res1 = await vttechApi.callHandler('/Customer/GeneralInfo/', 'LoadData', { CustomerID: customerId });
  console.log('LoadData Response Table Keys:', res1?.Table ? Object.keys(res1.Table) : 'No Table', !!res1?.Table?.[0]);

  console.log('Testing handler: Loadata...');
  const res2 = await vttechApi.callHandler('/Customer/GeneralInfo/', 'Loadata', { CustomerID: customerId });
  console.log('Loadata Response Table Keys:', res2?.Table ? Object.keys(res2.Table) : 'No Table', !!res2?.Table?.[0]);

  await app.close();
}

main().catch(console.error);
