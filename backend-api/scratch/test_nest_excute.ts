import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Testing TicketSourceTypeDetail Excute via VttechApiService...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  try {
    const payload = JSON.stringify({
      Name: 'KHOÁ MẸ & BÉ SOL CN',
      Note: '',
      Type: '62'
    });

    const res = await vttechApi.callHandler('/Marketing/TicketSourceTypeDetail', 'Excute', {
      CurrentID: '0',
      data: payload
    }, 'CHIKIET');

    console.log('Raw response:', res);
    if (res) {
      const decomp = vttechApi.decompress(res);
      console.log('Decompressed response:', decomp);
    }
  } catch (e: any) {
    console.error('Error calling handler:', e.message);
  }

  await app.close();
}

main().catch(console.error);
