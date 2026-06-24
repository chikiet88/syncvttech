import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync.service';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaService } from '../src/prisma.service';

async function main() {
  console.log('Bootstrapping NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  console.log('Resolving services...');
  const syncService = app.get(SyncService);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);
  
  const testDate = '2026-06-18';
  
  // Lấy chi nhánh active đầu tiên
  const activeBranch = await prisma.branch.findFirst({ where: { is_active: 1 } });
  if (!activeBranch) {
    console.error('No active branch found in DB.');
    await app.close();
    return;
  }
  const branchId = activeBranch.id;
  console.log(`Using branch: ${activeBranch.name} (ID: ${branchId}) for null safety testing.`);
  
  // 1. Kiểm tra số lượng giao dịch hiện tại trong database cho ngày testDate và branchId
  const parsedDate = new Date(testDate);
  const nextDate = new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000);
  const countBefore = await prisma.revenueTransaction.count({
    where: { branch_id: branchId, date: { gte: parsedDate, lt: nextDate } }
  });
  console.log(`[Before Test] Số lượng giao dịch trong DB ngày ${testDate}: ${countBefore}`);
  
  // 2. Mock API getRevenueByBranch để trả về null
  console.log('Mocking vttechApi.getRevenueByBranch to return null...');
  const originalGetRevenue = vttechApi.getRevenueByBranch;
  vttechApi.getRevenueByBranch = async () => null;
  
  try {
    // Chạy syncByRange cho ngày testDate. Chúng ta kỳ vọng nó sẽ throw error và KHÔNG xóa database.
    console.log(`Running syncByRange for ${testDate}...`);
    await syncService.syncByRange(testDate, testDate, false, false, false);
    console.log('❌ Lỗi: syncByRange không ném ra lỗi khi API trả về null!');
  } catch (err: any) {
    console.log(`✅ Thành công: syncByRange ném ra lỗi đúng kỳ vọng: ${err.message}`);
  } finally {
    // Restore original function
    vttechApi.getRevenueByBranch = originalGetRevenue;
  }
  
  // 3. Kiểm tra lại xem dữ liệu có bị xóa không
  const countAfter = await prisma.revenueTransaction.count({
    where: { branch_id: branchId, date: { gte: parsedDate, lt: nextDate } }
  });
  console.log(`[After Test] Số lượng giao dịch trong DB ngày ${testDate}: ${countAfter}`);
  
  if (countBefore === countAfter) {
    console.log('🎉 XÁC NHẬN: Không có dữ liệu nào bị xóa khi API trả về null!');
  } else {
    console.log('❌ LỖI: Dữ liệu đã bị xóa hoặc thay đổi! Before: ' + countBefore + ', After: ' + countAfter);
  }
  
  await app.close();
}

main().catch(err => {
  console.error('Null safety test failed:', err);
});
