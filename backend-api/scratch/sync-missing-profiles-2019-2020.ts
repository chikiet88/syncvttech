import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaService } from '../src/prisma.service';

async function main() {
  console.log('🚀 Khởi chạy Nest Application Context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);

  // 1. Tìm danh sách ID khách hàng thiếu hồ sơ
  console.log('🔍 Đang quét các giao dịch từ 01/01/2019 - 31/12/2020 để tìm ID khách hàng thiếu hồ sơ...');
  const missingCustomers: any[] = await prisma.$queryRaw`
    SELECT DISTINCT rt.customer_id, rt.customer_name
    FROM revenue_transactions rt
    LEFT JOIN customers c ON rt.customer_id = c.id
    WHERE rt.date >= '2019-01-01' AND rt.date <= '2020-12-31'
      AND rt.customer_id IS NOT NULL
      AND c.id IS NULL
    ORDER BY rt.customer_id;
  `;

  const totalMissing = missingCustomers.length;
  console.log(`📋 Phát hiện ${totalMissing} khách hàng có giao dịch doanh thu nhưng chưa có hồ sơ trong bảng 'customers'.`);

  if (totalMissing === 0) {
    console.log('✅ Tất cả khách hàng trong giai đoạn này đều đã có hồ sơ. Không cần đồng bộ thêm!');
    await app.close();
    return;
  }

  // 2. Đăng nhập VTTech CRM
  console.log('🔐 Đang đăng nhập hệ thống CRM VTTech...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();
  console.log('✅ Hệ thống VTTech đã sẵn sàng!');

  let successCount = 0;
  let failCount = 0;

  // Helper function để parse ngày tháng an toàn
  const parseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? null : d;
  };

  // Helper function để parse số
  const parseNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : num;
  };

  console.log(`⚡ Bắt đầu đồng bộ nhanh hồ sơ cho ${totalMissing} khách hàng...`);

  for (let i = 0; i < totalMissing; i++) {
    const cust = missingCustomers[i];
    const customerId = Number(cust.customer_id);

    try {
      // Gọi API VTTech lấy thông tin cơ bản
      const res = await vttechApi.callHandler('/Customer/GeneralInfo/', 'Loadata', { CustomerID: customerId });
      
      if (res && res.Table && res.Table[0]) {
        const info = res.Table[0];
        const name = info.CustName || info.FullName || info.Name || cust.customer_name || 'Unknown';
        const code = info.Cust_Code || info.Document_Code || info.CustCode || null;
        const phone = info.Phone1 || info.Phone || null;
        const gender = parseInt(info.Gender_ID) || null;
        const branchId = parseInt(info.BranchID) || null;
        const birthday = parseDate(info.Birthday);
        const address = info.Address || '';
        const paid = parseNumber(info.TotalPaid || 0);

        // Lưu thông tin vào bảng 'customers'
        await prisma.customer.upsert({
          where: { id: customerId },
          update: {
            name,
            code,
            phone,
            gender,
            branch_id: branchId,
            birthday,
            address,
            total_spent: paid,
          },
          create: {
            id: customerId,
            name,
            code,
            phone,
            gender,
            branch_id: branchId,
            birthday,
            address,
            total_spent: paid,
            total_debt: 0,
          }
        });

        successCount++;
        if (successCount % 10 === 0 || i === totalMissing - 1) {
          console.log(`   [Đồng bộ] Đã xử lý: ${i + 1}/${totalMissing} khách hàng. Thành công: ${successCount}.`);
        }
      } else {
        console.warn(`   ⚠️ Không tìm thấy thông tin trên CRM cho khách hàng ID: ${customerId} (${cust.customer_name})`);
        failCount++;
      }
    } catch (e: any) {
      console.error(`   ❌ Lỗi khi đồng bộ khách hàng ID ${customerId}: ${e.message}`);
      failCount++;
    }

    // Nghỉ 100ms tránh quá tải API (Rate limit)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n=========================================');
  console.log('🎉 HOÀN TẤT ĐỒNG BỘ HỒ SƠ NHANH');
  console.log(`- Tổng số cần đồng bộ: ${totalMissing}`);
  console.log(`- Đồng bộ thành công:  ${successCount}`);
  console.log(`- Thất bại / Bỏ qua:    ${failCount}`);
  console.log('=========================================');

  await app.close();
}

main().catch(console.error);
