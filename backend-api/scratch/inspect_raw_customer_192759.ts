import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log('🔄 Logging in...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const customerId = 192759;

  try {
    const res = await vttechApi.callHandler(
      '/Customer/Service/TabList/TabList_Service/',
      'LoadataTab',
      { CustomerID: customerId }
    );
    
    // Find services in the returned tables
    const tables = Array.isArray(res) ? [res] : Object.values(res);
    for (const [idx, t] of tables.entries()) {
      if (Array.isArray(t)) {
        const found = t.filter((s: any) => s.ID === 369618 || s.id === 369618 || s.ID === 382765 || s.id === 382765);
        if (found.length > 0) {
          console.log(`Found services in table index ${idx}:`, JSON.stringify(found, null, 2));
        }
      }
    }
  } catch (e: any) {
    console.error(`- LoadataTab Error:`, e.message);
  }

  await app.close();
}

test().catch(console.error);
