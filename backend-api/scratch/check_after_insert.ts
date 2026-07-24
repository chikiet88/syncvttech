import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function main() {
  console.log('🚀 Checking VTTech TicketSourceList after insertion...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  try {
    const res = await vttechApi.callHandler('/Marketing/TicketSourceList/', 'LoadData', {}, 'CHIKIET');
    if (res) {
      const decomp = vttechApi.decompress(res);
      console.log(`Table (Nguồn cha) count: ${decomp.Table?.length || 0}`);
      console.log(`Table1 (Chi tiết) count: ${decomp.Table1?.length || 0}`);

      const table1 = decomp.Table1 || [];
      const meBeItems = table1.filter((item: any) => 
        (item.TypeDetailName || '').toLowerCase().includes('mẹ & bé') || 
        (item.TypeDetailName || '').toLowerCase().includes('me & be')
      );

      console.log(`\n🎉 Found ${meBeItems.length} "KHOÁ MẸ & BÉ" detailed sources on VTTech:`);
      meBeItems.forEach((item: any, idx: number) => {
        console.log(`${idx + 1}. [Nguồn Cha: ${item.Name} (ID:${item.ID})] -> ID Chi Tiết: ${item.TypeDetailID} | Tên Chi Tiết: "${item.TypeDetailName}"`);
      });

      fs.writeFileSync('scratch/sources_chikiet.json', JSON.stringify(decomp, null, 2));
    }
  } catch (e: any) {
    console.error('Error fetching TicketSourceList:', e.message);
  }

  await app.close();
}

main().catch(console.error);
