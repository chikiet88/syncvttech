import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  try {
    const result = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'Initialize', {});
    console.log('Keys in Appointment Initialize Data:', Object.keys(result));
    for (const key of Object.keys(result)) {
      const list = result[key];
      if (Array.isArray(list)) {
        console.log(`\n=== Table: ${key} (Length: ${list.length}) ===`);
        if (list.length > 0) {
          console.log('Sample item:', JSON.stringify(list[0], null, 2));
        }
      }
    }
  } catch (e: any) {
    console.error('Failed to call Appointment Initialize:', e.message);
  }

  await app.close();
}

main().catch(console.error);
