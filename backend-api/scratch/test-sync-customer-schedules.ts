import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const customerId = 200385;

  console.log(`\nFetching schedule list for customer ${customerId} from VTTech...`);
  try {
    const res = await vttechApi.callHandler('/Customer/ScheduleList_Schedule/', 'Loadata', {
      CustomerID: customerId,
      TicketID: 0,
      Limit: 100,
      BeginID: 0,
      BeginDate: 0,
      IsDelete: 0,
      IsCancel: 1,
      IsTemp: 0
    });
    
    console.log('API Response:', JSON.stringify(res, null, 2));
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
  }

  await app.close();
}

bootstrap().catch(console.error);
