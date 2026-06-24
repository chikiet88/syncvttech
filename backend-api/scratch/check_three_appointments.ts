import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSchedules(vttechApi: VttechApiService, customerId: number, appointmentId: number) {
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
    const items = Array.isArray(res) ? res : [];
    const match = items.find((item: any) => parseInt(item.ID) === appointmentId);
    if (match) {
      console.log(`Appointment ID ${appointmentId} (Cust ID ${customerId}):`);
      console.log(`- VTTech Status: ${match.StatusName} (Color: ${match.ColorCode})`);
      console.log(`- Date From: ${match.Date_From}`);
      console.log(`- Reason: ${match.ReasonName}`);
      console.log(`- Raw Match:`, JSON.stringify(match, null, 2));
    } else {
      console.log(`Appointment ID ${appointmentId} NOT found in ScheduleList for Cust ID ${customerId}.`);
    }
  } catch (e: any) {
    console.error(`Error checking Cust ID ${customerId}:`, e.message);
  }
}

async function main() {
  console.log('🚀 Bootstrapping NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log('🔑 Logged in check...');
  const loggedIn = await vttechApi.login();
  if (!loggedIn) {
    console.error('Failed to login to VTTech API.');
    await app.close();
    return;
  }
  await vttechApi.getXsrfToken();

  console.log('\n--- Checking 3 stuck appointments ---');
  await checkSchedules(vttechApi, 196421, 773427);
  await checkSchedules(vttechApi, 199360, 773558);
  await checkSchedules(vttechApi, 199532, 776999);

  await app.close();
}

main().catch(console.error);
