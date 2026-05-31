const { VttechApiService } = require('../dist/src/vttech-api.service');
const { ConfigService } = require('@nestjs/config');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const configService = new ConfigService();
  const vttechApi = new VttechApiService(configService);

  console.log('Logging in...');
  try {
    const res = await vttechApi.callHandler(
      '/Desk/Appointment/AppointmentInDay_Desk_Branch/',
      'LoadataAppointmentList',
      {
        DateFrom: '2026-04-24',
        BranchID: '4',
        AppID: '753654',
        StatusID: '0',
        DoctorID: '0',
        TypeApp: '1',
      }
    );

    const items = Array.isArray(res) ? res : (res?.Table || []);
    console.log(`Fetched ${items.length} appointments`);

    if (items.length > 0) {
      console.log('Appointment 753654:');
      console.log(JSON.stringify(items[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
