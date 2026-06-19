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
  
  // Lọc đúng khoảng thời gian trên màn hình: 2019-01-01 đến 2022-12-31
  const dateFrom = '2019-01-01 00:00:00';
  const dateTo = '2022-12-31 23:59:59';

  console.log(`\n--- GỌI API LOADDATATOTAL (${dateFrom} -> ${dateTo}) ---`);
  
  let grandPaid = 0;
  let grandProfile = 0;
  let grandApp = 0;
  let grandAppChecked = 0;
  let grandPaidNumCust = 0;

  for (const b of branches) {
    try {
      const res = await vttechApi.callHandler('/Customer/ListCustomer/', 'LoadDataTotal', {
        dateFrom,
        dateTo,
        branchID: b.id.toString()
      });
      if (res && res[0]) {
        const item = res[0];
        const profile = parseInt(item.Profile) || 0;
        const paid = parseFloat(item.Paid) || 0;
        const paidNumCust = parseInt(item.PaidNumCust) || 0;
        const app = parseInt(item.App) || 0;
        const appChecked = parseInt(item.AppChecked) || 0;

        console.log(`Chi nhánh ${b.id} (${b.name}):`);
        console.log(`  - Profile (Khách mới): ${profile}`);
        console.log(`  - PaidNumCust (KH thanh toán): ${paidNumCust}`);
        console.log(`  - App (Lịch hẹn): ${app}`);
        console.log(`  - AppChecked (Checkin): ${appChecked}`);
        
        grandProfile += profile;
        grandPaid += paid;
        grandPaidNumCust += paidNumCust;
        grandApp += app;
        grandAppChecked += appChecked;
      }
    } catch(e: any) {
      console.error(`Lỗi chi nhánh ${b.id}: ${e.message}`);
    }
  }

  console.log(`\n==========================================`);
  console.log(`TỔNG CỘNG CRM LOADDATATOTAL:`);
  console.log(`- Profile (Khách mới): ${grandProfile}`);
  console.log(`- PaidNumCust (Khách thanh toán): ${grandPaidNumCust}`);
  console.log(`- App (Lịch hẹn): ${grandApp}`);
  console.log(`- AppChecked (Checkin): ${grandAppChecked}`);
  console.log(`==========================================`);

  await app.close();
}

main().catch(console.error);
