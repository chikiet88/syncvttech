import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log('Logging in and priming VTTech API...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();
  console.log('VTTech API ready!');

  const customerId = 6452;
  console.log(`Checking customer ${customerId} from VTTech...`);
  try {
    const res = await vttechApi.callHandler('/Customer/GeneralInfo/', 'Loadata', { CustomerID: customerId });
    console.log('Response for general info:', JSON.stringify(res, null, 2));
  } catch (e: any) {
    console.error('Error fetching general info:', e.message);
  }

  await app.close();
}

main().catch(console.error);
