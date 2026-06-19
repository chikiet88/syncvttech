import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const targetBranch = 6;
  const targetDate = '2026-06-17';

  try {
    const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
      DateFrom: targetDate,
      BranchID: targetBranch.toString(),
      AppID: '0',
      StatusID: '0',
      DoctorID: '0',
      TypeApp: '1',
    });
    
    const dataItems = Array.isArray(res) ? res : [];
    if (dataItems.length > 0) {
      console.log('Keys of raw appointment:', Object.keys(dataItems[0]));
      console.log('Sample raw appointment:', JSON.stringify(dataItems[0], null, 2));
      
      // Save 5 sample records
      fs.writeFileSync(
        path.join(__dirname, './sample-raw-appointments.json'),
        JSON.stringify(dataItems.slice(0, 5), null, 2)
      );
    } else {
      console.log('No data items returned');
    }
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
  }

  await app.close();
}

bootstrap().catch(console.error);
