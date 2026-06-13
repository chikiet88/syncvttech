import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  const result = await vttechApi.callApi('/api/Home/SessionData', {});

  for (const key of Object.keys(result)) {
    const list = result[key];
    if (Array.isArray(list) && list.length > 0) {
      console.log(`\n=== Table: ${key} (Length: ${list.length}) ===`);
      console.log('Sample item:', JSON.stringify(list[0], null, 2));
    }
  }

  await app.close();
}

main().catch(console.error);
