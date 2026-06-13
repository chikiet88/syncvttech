import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  console.log('Logged in successfully!');

  // Fetch appointments for 2026-06-03
  const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
    DateFrom: '2026-06-03',
    BranchID: '1',
    AppID: '0',
    StatusID: '0',
    DoctorID: '0',
    TypeApp: '1',
  });

  const appointments = Array.isArray(res) ? res : (res?.Table || res?.Data || []);
  console.log(`Found ${appointments.length} appointments.`);

  if (appointments.length > 0) {
    console.log('Sample appointment:', JSON.stringify(appointments[0], null, 2));
    
    // Check if any appointment has a funnel/phễu field or values related to "phễu"
    console.log('Checking all appointments keys...');
    const keys = new Set<string>();
    appointments.forEach((a: any) => {
      Object.keys(a).forEach(k => keys.add(k));
    });
    console.log('All keys:', Array.from(keys));

    // Search for any values with "phễu"
    console.log('\nSearching for fields containing "phễu" or similar:');
    appointments.forEach((a: any) => {
      Object.entries(a).forEach(([k, v]) => {
        if (typeof v === 'string' && v.toLowerCase().includes('phễu')) {
          console.log(`Found value containing "phễu": key "${k}" = "${v}" (App ID: ${a.ID || a.ScheduleID})`);
        }
      });
    });
  }

  await app.close();
}

main().catch(console.error);
