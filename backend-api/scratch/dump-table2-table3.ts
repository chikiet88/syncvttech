import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  const result = await vttechApi.callApi('/api/Home/SessionData', {});

  const services = result.Table2 || [];
  const groups = result.Table3 || [];

  console.log('=== SERVICE GROUPS (Table3) ===');
  groups.slice(0, 30).forEach((g: any) => {
    console.log(`ID: ${g.ID} | Name: ${g.Name} | Color: ${g.Color}`);
  });

  console.log('\n=== SERVICES (Table2) ===');
  services.slice(0, 30).forEach((s: any) => {
    console.log(`ID: ${s.ID} | Name: ${s.Name} | Code: ${s.Code} | Type: ${s.Type} | Color: ${s.Color} | State: ${s.State}`);
  });

  await app.close();
}

main().catch(console.error);
