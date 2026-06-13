import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  console.log('Logged in successfully!');

  const result = await vttechApi.callApi('/api/Home/SessionData', {});
  console.log('Keys in SessionData:', Object.keys(result));

  if (result.Table2 && result.Table2.length > 0) {
    console.log('Sample service:', JSON.stringify(result.Table2[0], null, 2));
    
    // Find all fields in Table2 items
    const keys = new Set<string>();
    result.Table2.forEach((s: any) => {
      Object.keys(s).forEach(k => keys.add(k));
    });
    console.log('All Service fields in Table2:', Array.from(keys));

    // Let's print first 5 services
    console.log('First 5 services in SessionData Table2:');
    result.Table2.slice(0, 5).forEach((s: any) => {
      console.log(`ID: ${s.ID} | Name: ${s.Name} | GroupID: ${s.GroupID} | Group_ID: ${s.Group_ID} | ServiceGroup: ${s.ServiceGroup} | Category: ${s.Category || s.CatID || s.CategoryID || s.ServiceCatID}`);
      console.log('Raw service object:', s);
    });
  }

  await app.close();
}

main().catch(console.error);
