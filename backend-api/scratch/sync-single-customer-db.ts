import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { SyncService } from '../src/sync.service';

async function main() {
  console.log('Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  const syncService = app.get(SyncService);

  console.log('Logging in...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const customerId = 200052;
  const branchId = 6;
  console.log(`Syncing customer ${customerId} schedules...`);
  
  // Gọi private method qua proxy
  const count = await (syncService as any).syncCustomerSchedules(customerId, branchId);
  console.log(`Successfully synced ${count} schedules into DB.`);

  await app.close();
}

main().catch(console.error);
