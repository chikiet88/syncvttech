
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSync() {
  console.log('--- 📊 TỔNG HỢP TRẠNG THÁI ĐỒNG BỘ ---');
  
  // 1. Lấy ngày gần nhất đã đồng bộ thành công
  const latestSuccess = await prisma.syncTask.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { date: 'desc' },
  });
  
  if (latestSuccess) {
    console.log(`✅ Ngày đồng bộ thành công gần nhất: ${latestSuccess.date.toISOString().split('T')[0]}`);
  } else {
    console.log('❌ Chưa có ngày nào đồng bộ thành công.');
  }

  // 2. Lấy số lượng task theo trạng thái
  const stats = await prisma.syncTask.groupBy({
    by: ['status'],
    _count: { id: true },
  });
  
  console.log('\n--- 📈 Thống kê Task ---');
  stats.forEach(s => {
    console.log(`- ${s.status}: ${s._count.id} tasks`);
  });

  // 3. Lấy các task gần đây (7 ngày qua)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentTasks = await prisma.syncTask.findMany({
    where: { date: { gte: sevenDaysAgo } },
    orderBy: { date: 'desc' },
  });

  if (recentTasks.length > 0) {
    console.log('\n--- 📅 Tình trạng các ngày gần đây ---');
    recentTasks.forEach(p => {
      console.log(`- [${p.date.toISOString().split('T')[0]}] ${p.type}: ${p.status} (${p.completed_details}/${p.total_details})`);
    });
  }

  // 4. Kiểm tra dữ liệu thực tế
  const customerCount = await prisma.customer.count();
  const revenueCount = await prisma.revenueTransaction.count();
  console.log('\n--- 📦 Dữ liệu đã lưu ---');
  console.log(`- Khách hàng: ${customerCount}`);
  console.log(`- Giao dịch doanh thu: ${revenueCount}`);

  await prisma.$disconnect();
}

checkSync();
