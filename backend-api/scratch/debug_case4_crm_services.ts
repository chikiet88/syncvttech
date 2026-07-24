import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const customerId = 190686;
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log(`🚀 Loading raw CRM services for customer ${customerId}...`);
  try {
    const services = await vttechApi.callHandler(
      '/Customer/Service/TabList/TabList_Service/',
      'LoadataTab',
      { CustomerID: customerId }
    );
    console.log(JSON.stringify(services, null, 2));
  } catch (error) {
    console.error('Error loading CRM services:', error);
  }

  await app.close();
}

bootstrap().catch(console.error);
