import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VttechApiService } from './vttech-api.service';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function main() {
  console.log('🚀 Bootstrapping NestJS context for TicketSourceList with CHIKIET...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  try {
    // Force create session for CHIKIET
    const session: any = {
      username: 'CHIKIET',
      password: '@hikiet88',
      token: null, secretKey: null, cookies: [], xsrfToken: null,
      lastUsedAt: 0, errorCount: 0, lastErrorAt: 0, loginByUsernamePromise: null, lock: null
    };

    console.log('🔑 Logging in CHIKIET...');
    const loggedIn = await vttechApi.login(session, true);
    console.log('Login result:', loggedIn);

    console.log('📡 Calling /Marketing/TicketSourceList/?handler=LoadData...');
    const res = await vttechApi.callHandler('/Marketing/TicketSourceList/', 'LoadData', {}, 'CHIKIET');
    console.log('API response keys:', res ? Object.keys(res) : null);
    
    if (res) {
      const decomp = vttechApi.decompress(res);
      console.log('Decompressed keys:', decomp ? Object.keys(decomp) : null);
      if (decomp && (decomp.Table || decomp.Table1)) {
        fs.writeFileSync('scratch/sources_chikiet.json', JSON.stringify(decomp, null, 2));
        console.log(`✅ SUCCESS! Table: ${decomp.Table?.length || 0} items, Table1: ${decomp.Table1?.length || 0} items.`);
      } else {
        console.log('Raw res:', JSON.stringify(res).substring(0, 500));
      }
    } else {
      console.log('Response was null');
    }
  } catch (e: any) {
    console.error('Error calling TicketSourceList handler:', e.message);
  }

  await app.close();
}

main().catch(console.error);
