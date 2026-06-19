import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const dateFrom = '01-01-2019';
  const dateTo = '31-12-2022';

  console.log(`\n--- QUERYING ALLBRANCHGRID (${dateFrom} -> ${dateTo}) ---`);
  
  try {
    const res = await vttechApi.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'Loadata', {
      branchID: '0',
      dateFrom,
      dateTo
    });
    console.log("Response structure keys:", Object.keys(res || {}));
    if (res && res.Table) {
      console.log(`Table rows count: ${res.Table.length}`);
      console.log("Sample row 1:", res.Table[0]);
    }
  } catch(e: any) {
    console.error(`Error: ${e.message}`);
  }

  await app.close();
}

main().catch(console.error);
