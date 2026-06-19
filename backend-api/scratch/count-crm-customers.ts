import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaService } from '../src/prisma.service';

/**
 * Script kiểm tra tổng số khách hàng trên CRM VTTech so với DB local
 * Quét theo từng chi nhánh, type 1 (Hồ sơ) cho 2019-2020
 */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);

  console.log('🔐 Đăng nhập VTTech API...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();
  console.log('✅ API ready!\n');

  // Lấy danh sách chi nhánh từ DB
  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  console.log(`📊 Có ${branches.length} chi nhánh trong hệ thống`);
  console.log('='.repeat(60));

  // Thử format ngày giống sync service: yyyy-MM-dd
  const dateFrom = '2019-01-01';
  const dateTo = '2020-12-31';

  // Trước tiên test với 1 chi nhánh, 1 ngày để xác nhận API hoạt động
  const testBranch = branches[0];
  console.log(`\n🧪 TEST: Chi nhánh "${testBranch.name}" (ID: ${testBranch.id}), ngày 2019-01-01`);
  
  for (const type of [1, 2, 3, 5]) {
    const typeName = { 1: 'Hồ sơ', 2: 'Dịch vụ', 3: 'Điều trị', 5: 'CheckedIn' }[type];
    try {
      const res = await vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', {
        dateFrom: '2019-01-01',
        dateTo: '2019-01-01',
        branchID: testBranch.id.toString(),
        type,
        BeginID: 0,
        BeginCustID: 0,
        Limit: 10,
      });
      const items = Array.isArray(res) ? res : [];
      console.log(`  Type ${type} (${typeName}): ${items.length} bản ghi`);
      if (items.length > 0) {
        console.log(`    Mẫu: CustID=${items[0].CustID}, Name=${items[0].CustName}, Code=${items[0].CustCode}`);
      }
    } catch (e: any) {
      console.log(`  Type ${type} (${typeName}): ❌ ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // Nếu test thành công, quét type 1 (Hồ sơ) cho tất cả chi nhánh
  // Dùng range 1 ngày: 2019-01-01 để so sánh với screenshot (20,487 hồ sơ ở Thủ Đức)
  console.log(`\n\n📊 QUÉT TYPE 1 (Hồ sơ) ngày 2019-01-01 - TẤT CẢ chi nhánh`);
  console.log('='.repeat(60));

  let grandTotal = 0;
  const allIds = new Set<number>();

  for (const branch of branches) {
    let branchTotal = 0;
    let start = 0;
    const pageSize = 500;
    let hasMore = true;

    while (hasMore) {
      try {
        const res = await vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', {
          dateFrom: '2019-01-01',
          dateTo: '2019-01-01',
          branchID: branch.id.toString(),
          type: 1,
          BeginID: start,
          BeginCustID: 0,
          Limit: pageSize,
        });
        const items = Array.isArray(res) ? res : [];
        
        if (items.length > 0) {
          for (const c of items) {
            const id = parseInt(c.CustID || c.ID);
            if (id) allIds.add(id);
          }
          branchTotal += items.length;
          start += pageSize;
          if (items.length < pageSize) hasMore = false;
        } else {
          hasMore = false;
        }
      } catch (e: any) {
        console.error(`  ❌ Branch ${branch.id} offset ${start}: ${e.message}`);
        hasMore = false;
      }
      await new Promise(r => setTimeout(r, 150));
    }

    grandTotal += branchTotal;
    if (branchTotal > 0) {
      console.log(`  ✅ ${branch.name} (ID: ${branch.id}): ${branchTotal.toLocaleString()} hồ sơ`);
    }
  }

  // Check DB local
  const localCount = await prisma.customer.count();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 TỔNG KẾT (Ngày 2019-01-01, Type 1 - Hồ sơ):`);
  console.log(`   CRM tổng bản ghi:  ${grandTotal.toLocaleString()}`);
  console.log(`   CRM ID duy nhất:   ${allIds.size.toLocaleString()}`);
  console.log(`   DB Local:          ${localCount.toLocaleString()}`);
  console.log(`   Chênh lệch:        ${(allIds.size - localCount).toLocaleString()}`);

  // Kiểm tra bao nhiêu CRM ID đã có trong DB
  if (allIds.size > 0) {
    const sampleIds = Array.from(allIds).slice(0, 1000);
    const existingCount = await prisma.customer.count({
      where: { id: { in: sampleIds } }
    });
    console.log(`\n   Trong ${sampleIds.length} CRM IDs mẫu, đã có ${existingCount} trong DB (${Math.round(existingCount/sampleIds.length*100)}%)`);
  }

  await app.close();
}

main().catch(console.error);
