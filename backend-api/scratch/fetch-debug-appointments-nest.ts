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

  console.log('Logging in and priming VTTech API...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();
  console.log('VTTech API ready!');

  // TAZA Skin Clinic Đà Nẵng (ID: 6)
  const targetBranch = 6;
  const targetDate = '2026-06-17';

  console.log(`\nFetching raw appointments for branch ${targetBranch} on ${targetDate}...`);
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
    console.log(`Received ${dataItems.length} raw records from VTTech API.`);

    // Lọc các cuộc hẹn "Tư Vấn"
    const tuVanItems = dataItems.filter((a: any) => 
      a.TypeName?.toLowerCase().includes('tư vấn') || 
      a.ServiceName?.toLowerCase().includes('tư vấn')
    );

    console.log(`Found ${tuVanItems.length} records that match "Tư Vấn".`);

    // In chi tiết từng bản ghi để xem trường StatusName, IsCancel, ReasonCancel, State
    const formatted = tuVanItems.map((a: any) => ({
      ID: a.ID || a.ScheduleID,
      Code: a.Code || a.CodeScheduler,
      CustName: a.CustName,
      Phone: a.Phone,
      DateFrom: a.DateFrom,
      TypeName: a.TypeName,
      ServiceName: a.ServiceName,
      StatusName: a.StatusName,
      IsCancel: a.IsCancel,
      ReasonCancel: a.ReasonCancel,
      State: a.State,
      ColorCode: a.ColorCode
    }));

    fs.writeFileSync(
      path.join(__dirname, './raw-tuvan-dn-17-06.json'),
      JSON.stringify(formatted, null, 2)
    );
    console.log('Saved to raw-tuvan-dn-17-06.json');
  } catch (e: any) {
    console.error(`Error querying appointments: ${e.message}`);
  }

  await app.close();
}

bootstrap().catch(console.error);
