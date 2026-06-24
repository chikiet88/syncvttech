import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VttechApiService } from './vttech-api.service';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function main() {
  console.log('🚀 Bootstrapping NestJS context for CRM sources check...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  try {
    const result = await vttechApi.callApi('/api/Home/SessionData', {});
    if (result && result.Table10) {
      console.log(`Found ${result.Table10.length} customer sources in SessionData.`);
      fs.writeFileSync('sources_session_data.json', JSON.stringify(result.Table10, null, 2));
      console.log('Saved to sources_session_data.json');
      
      const matches = result.Table10.filter((s: any) => 
        s.Name.includes('TELE') || s.Name.includes('FB') || s.Name.includes('SOL') || s.ID === '239' || s.ID === '240' || s.ID === '241' || s.ID === 239 || s.ID === 240 || s.ID === 241
      );
      console.log('Matches:', matches);
    } else {
      console.log('No Table10 in SessionData.', Object.keys(result));
    }
  } catch (e: any) {
    console.error('Error fetching SessionData:', e.message);
  }

  await app.close();
}

main().catch(console.error);
