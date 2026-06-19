import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaService } from '../src/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);

  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  const dateFrom = '2019-01-01';
  const dateTo = '2026-06-18';

  console.log(`--- COUNTING CRM PROFILES (${dateFrom} to ${dateTo}) ---`);
  let grandTotal = 0;
  for (const b of branches) {
    try {
      const res = await vttechApi.callHandler('/Customer/ListCustomer/', 'LoadDataTotal', {
        dateFrom,
        dateTo,
        branchID: b.id.toString()
      });
      const profileCount = res && res[0] ? parseInt(res[0].Profile) || 0 : 0;
      console.log(`Branch ID ${b.id} (${b.name}): ${profileCount} profiles`);
      grandTotal += profileCount;
    } catch(e: any) {
      console.error(`Error for branch ${b.id}: ${e.message}`);
    }
  }
  console.log(`==========================================`);
  console.log(`GRAND TOTAL PROFILE COUNT: ${grandTotal}`);
  console.log(`==========================================`);

  await app.close();
}

main().catch(console.error);
