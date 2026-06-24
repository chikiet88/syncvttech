import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VttechApiService } from './vttech-api.service';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function main() {
  console.log('🚀 Bootstrapping NestJS context for CRM SettingListParam check...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  try {
    const res = await vttechApi.callHandler('/Setting/SettingListParam/', 'LoadData', {
      slug: 'nguon-khach-hang',
      limit: 100,
      offset: 0
    });
    console.log('API response keys:', res ? Object.keys(res) : null);
    if (res) {
      fs.writeFileSync('setting_list_param_res.json', JSON.stringify(res, null, 2));
      console.log('Saved to setting_list_param_res.json');
      if (Array.isArray(res)) {
        console.log(`Response is array of ${res.length} items.`);
        console.log('Sample item:', res[0]);
      } else if (res.Data || res.Table) {
        const items = res.Data || res.Table;
        console.log(`Response has Data/Table of ${items.length} items.`);
        console.log('Sample item:', items[0]);
      } else {
        console.log('Response content:', JSON.stringify(res).substring(0, 1000));
      }
    }
  } catch (e: any) {
    console.error('Error calling SettingListParam handler:', e.message);
  }

  await app.close();
}

main().catch(console.error);
