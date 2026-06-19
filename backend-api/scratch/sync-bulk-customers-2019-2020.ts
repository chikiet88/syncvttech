import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaService } from '../src/prisma.service';
import * as crypto from 'crypto';

async function main() {
  console.log('🚀 Khởi chạy Nest Application Context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);

  console.log('🔐 Đang đăng nhập hệ thống CRM VTTech...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();
  console.log('✅ Hệ thống VTTech đã sẵn sàng!');

  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  console.log(`📊 Đang thực hiện quét 2019-2020 trên ${branches.length} chi nhánh...`);
  console.log('='.repeat(80));

  const dateFrom = '2019-01-01';
  const dateTo = '2020-12-31';

  // Helper functions
  const parseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? null : d;
  };

  const parseNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const generateHash = (data: any): string => {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  };

  let totalNew = 0;
  let totalUpdated = 0;
  let totalProcessed = 0;

  for (const branch of branches) {
    console.log(`\n🏢 Bắt đầu đồng bộ chi nhánh: "${branch.name}" (ID: ${branch.id})`);
    let beginID = 0;
    let beginCustID = 0;
    let branchProcessed = 0;
    let branchNew = 0;
    let branchUpdated = 0;
    let page = 1;
    const limit = 500;
    let hasMore = true;

    while (hasMore) {
      console.log(`  Page ${page} (BeginID: ${beginID}, BeginCustID: ${beginCustID})...`);
      try {
        const res = await vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', {
          dateFrom,
          dateTo,
          branchID: branch.id.toString(),
          type: 5, // Tạo hồ sơ
          BeginID: beginID,
          BeginCustID: beginCustID,
          Limit: limit,
        });

        const items = Array.isArray(res) ? res : [];
        if (items.length === 0) {
          console.log(`  -> Hết dữ liệu cho chi nhánh ${branch.name}.`);
          hasMore = false;
          break;
        }

        console.log(`  -> Nhận được ${items.length} hồ sơ từ CRM. Đang chuẩn bị lô ghi...`);

        // BATCHING READS:
        const ids = items.map(c => parseInt(c.CustID || c.ID || c.id)).filter(Boolean);
        if (ids.length === 0) {
          hasMore = false;
          break;
        }

        // 1. Lấy thông tin khách hàng hiện tại hàng loạt
        const existingCustomers = await prisma.customer.findMany({
          where: { id: { in: ids } }
        });
        const existingMap = new Map(existingCustomers.map(ec => [ec.id, ec]));

        // 2. Lấy hoạt động daily muộn nhất hàng loạt
        const maxDailyDates = await prisma.dailyCustomer.groupBy({
          by: ['customer_id'],
          _max: { date: true },
          where: { customer_id: { in: ids } }
        });
        const dailyMap = new Map(maxDailyDates.map(d => [d.customer_id, d._max.date]));

        // 3. Đảm bảo nguồn và chi nhánh tồn tại
        const sourceIds = items.map(c => parseInt(c.SourceID)).filter(Boolean);
        const branchIds = items.map(c => parseInt(c.BranchID || c.branch_id) || branch.id).filter(Boolean);

        const uniqueSourceIds = [...new Set(sourceIds)];
        const uniqueBranchIds = [...new Set(branchIds)];

        const existingSources = await prisma.customerSource.findMany({
          where: { id: { in: uniqueSourceIds } },
          select: { id: true }
        });
        const existingSourceSet = new Set(existingSources.map(s => s.id));

        const existingBranches = await prisma.branch.findMany({
          where: { id: { in: uniqueBranchIds } },
          select: { id: true }
        });
        const existingBranchSet = new Set(existingBranches.map(b => b.id));

        for (const sid of uniqueSourceIds) {
          if (!existingSourceSet.has(sid)) {
            await prisma.customerSource.create({ data: { id: sid, name: `Nguồn #${sid}` } }).catch(() => {});
            existingSourceSet.add(sid);
          }
        }
        for (const bid of uniqueBranchIds) {
          if (!existingBranchSet.has(bid)) {
            await prisma.branch.create({ data: { id: bid, name: `Chi nhánh #${bid}` } }).catch(() => {});
            existingBranchSet.add(bid);
          }
        }

        // BATCHING WRITES:
        let pageNew = 0;
        let pageUpdated = 0;

        const tasks = items.map(async (c) => {
          const id = parseInt(c.CustID || c.ID || c.id);
          if (!id) return;

          const name = c.CustName || c.FullName || c.Name || 'Unknown';
          const phone = c.Phone || c.Mobile || '';
          const email = c.Email || c.Email1 || '';
          const code = c.CustCode || c.Cust_Code || c.Document_Code || null;
          const gender = parseInt(c.GenderID || c.Gender) || null;
          const birthday = parseDate(c.Birth || c.Birthday);
          const address = c.Address || '';
          const sourceId = parseInt(c.SourceID) || null;
          const crmCreatedAt = parseDate(c.Created);
          const paid = parseNumber(c.TotalPaid || c.Amount || c.TotalAmount || 0);

          let debt = 0;
          if (c.TotalRaise !== undefined && c.TotalPaid !== undefined) {
            debt = parseNumber(c.TotalRaise) - parseNumber(c.TotalPaid);
          } else {
            debt = parseNumber(c.Debt || c.RemainAmount || 0);
          }

          const branchIdFromData = parseInt(c.BranchID || c.branch_id) || branch.id || null;

          const hashData = {
            name, phone, email, paid, debt,
            branchIdFromData, gender, birthday, address, sourceId, code,
            crmCreatedAt: crmCreatedAt ? crmCreatedAt.toISOString() : null
          };
          const currentHash = generateHash(hashData);

          const existingCustomer = existingMap.get(id);

          const finalSpent = existingCustomer ? Math.max(existingCustomer.total_spent, paid) : paid;
          const finalDebt = existingCustomer ? (existingCustomer.total_spent > paid ? existingCustomer.total_debt : debt) : debt;

          let shouldUpdateProfile = true;
          if (existingCustomer) {
            const parsedDate = crmCreatedAt || new Date('2019-01-01');
            const maxDailyDate = dailyMap.get(id);
            if (maxDailyDate && maxDailyDate > parsedDate) {
              shouldUpdateProfile = false;
            }
          }

          if (!existingCustomer || existingCustomer.last_hash !== currentHash) {
            await prisma.customer.upsert({
              where: { id },
              update: {
                ...(shouldUpdateProfile ? {
                  name,
                  phone,
                  email,
                  branch_id: branchIdFromData,
                  gender,
                  birthday,
                  address,
                  source_id: sourceId,
                  code,
                } : {}),
                total_spent: finalSpent,
                total_debt: finalDebt,
                crm_created_at: crmCreatedAt,
                last_hash: currentHash,
              },
              create: {
                id,
                name,
                phone,
                email,
                total_spent: paid,
                total_debt: debt,
                branch_id: branchIdFromData,
                gender,
                birthday,
                address,
                source_id: sourceId,
                code,
                crm_created_at: crmCreatedAt,
                last_hash: currentHash,
              },
            });

            if (existingCustomer) {
              pageUpdated++;
            } else {
              pageNew++;
            }
          }

          // Ghi nhận hoạt động tạo hồ sơ vào daily_customers
          const activityDate = crmCreatedAt || new Date('2019-01-01');
          await prisma.dailyCustomer.upsert({
            where: { date_customer_id: { date: activityDate, customer_id: id } },
            update: {
              branch_id: branchIdFromData,
              customer_name: name,
              phone: phone,
              email: email || null,
              gender: gender,
              birthday: birthday,
              source_id: sourceId
            },
            create: {
              date: activityDate,
              customer_id: id,
              branch_id: branchIdFromData,
              customer_name: name,
              phone: phone,
              email: email || null,
              gender: gender,
              birthday: birthday,
              source_id: sourceId
            }
          });
        });

        // Chạy song song theo từng lô 50 bản ghi để tối ưu DB connection pool
        const chunkSize = 50;
        for (let i = 0; i < tasks.length; i += chunkSize) {
          const chunk = tasks.slice(i, i + chunkSize);
          await Promise.all(chunk);
        }

        branchNew += pageNew;
        branchUpdated += pageUpdated;
        totalNew += pageNew;
        totalUpdated += pageUpdated;
        branchProcessed += items.length;
        totalProcessed += items.length;

        console.log(`  -> Trang ${page} hoàn thành: Đồng bộ ${items.length} hồ sơ. (Lũy kế: Mới: ${branchNew}, Cập nhật: ${branchUpdated})`);

        // Cập nhật các tham số phân trang
        const lastItem = items[items.length - 1];
        beginID = lastItem.NumDate || beginID;
        beginCustID = lastItem.CustID || beginCustID;

        // Nếu số lượng nhận được ít hơn limit thì chắc chắn hết trang
        if (items.length < limit) {
          hasMore = false;
        } else {
          page++;
        }
      } catch (e: any) {
        console.error(`  ❌ Lỗi ở page ${page} chi nhánh ${branch.name}: ${e.message}`);
        console.log('  ⚠️ Nghỉ 5s rồi thử lại...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Nghỉ 100ms tránh spam API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`  ✨ Chi nhánh "${branch.name}" hoàn tất: Đã xử lý ${branchProcessed} hồ sơ (Mới: ${branchNew}, Cập nhật: ${branchUpdated})`);
  }

  console.log('\n================================================================================');
  console.log('🎉 HOÀN THẤT ĐỒNG BỘ TOÀN BỘ HỒ SƠ KHÁCH HÀNG 2019-2020');
  console.log(`- Tổng số hồ sơ xử lý:    ${totalProcessed}`);
  console.log(`- Tạo mới trong DB local:  ${totalNew}`);
  console.log(`- Cập nhật trong DB local: ${totalUpdated}`);
  console.log('================================================================================');

  await app.close();
}

main().catch(console.error);
