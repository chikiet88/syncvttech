import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  try {
    const result = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'Initialize', {});
    
    if (Array.isArray(result)) {
      console.log('Result is an array of length:', result.length);
      console.log('Sample item 0:', JSON.stringify(result[0], null, 2));
      console.log('Sample item 1:', JSON.stringify(result[1], null, 2));
      
      const keys = new Set<string>();
      result.forEach((item: any) => {
        if (item) Object.keys(item).forEach(k => keys.add(k));
      });
      console.log('All fields in items:', Array.from(keys));
    } else {
      console.log('Result is not an array, type:', typeof result);
      console.log('First 500 chars:', JSON.stringify(result).substring(0, 500));
    }
  } catch (e: any) {
    console.error('Failed to call Appointment Initialize:', e.message);
  }

  await app.close();
}

main().catch(console.error);
