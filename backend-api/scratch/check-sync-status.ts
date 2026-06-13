import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== BÁO CÁO TÌNH HÌNH ĐỒNG BỘ VTTECH ===\n');

  // 1. Thống kê tổng quan sync tasks
  const taskStatusCounts = await prisma.syncTask.groupBy({
    by: ['status'],
    _count: {
      id: true,
    },
  });

  console.log('1. THỐNG KÊ TRẠNG THÁI TASK ĐỒNG BỘ (Sync Tasks):');
  let totalTasks = 0;
  taskStatusCounts.forEach(t => {
    console.log(`  - Trạng thái [${t.status}]: ${t._count.id} tasks`);
    totalTasks += t._count.id;
  });
  console.log(`  => Tổng số tasks: ${totalTasks}\n`);

  // 2. Thống kê theo ngày gần đây (11/06, 12/06, 13/06)
  console.log('2. TÌNH HÌNH ĐỒNG BỘ CÁC NGÀY GẦN ĐÂY:');
  const recentDates = ['2026-06-11', '2026-06-12', '2026-06-13'];
  for (const dateStr of recentDates) {
    const date = new Date(dateStr);
    const tasks = await prisma.syncTask.findMany({
      where: {
        date: date,
      },
    });

    const success = tasks.filter(t => t.status === 'SUCCESS').length;
    const failed = tasks.filter(t => t.status === 'FAILED').length;
    const processing = tasks.filter(t => t.status === 'PROCESSING').length;
    const pending = tasks.filter(t => t.status === 'PENDING').length;

    console.log(`  * Ngày ${dateStr}: Tổng ${tasks.length} tasks | SUCCESS: ${success} | FAILED: ${failed} | PROCESSING: ${processing} | PENDING: ${pending}`);
    
    // Tính tổng số lượng bản ghi đồng bộ được của ngày đó
    const totalAppointments = tasks.reduce((sum, t) => sum + t.appointments_count, 0);
    const totalCustomers = tasks.reduce((sum, t) => sum + t.customers_count, 0);
    const totalRevenue = tasks.reduce((sum, t) => sum + t.revenue_total, 0);
    console.log(`    -> Đồng bộ được: ${totalAppointments} Lịch hẹn | ${totalCustomers} Khách hàng | Doanh thu: ${totalRevenue.toLocaleString('vi-VN')} VND`);
  }
  console.log('');

  // 3. Danh sách các task bị FAILED gần đây
  console.log('3. CHI TIẾT CÁC TASK THẤT BẠI (FAILED) GẦN ĐÂY (Tối đa 5 tasks):');
  const failedTasks = await prisma.syncTask.findMany({
    where: {
      status: 'FAILED',
    },
    orderBy: {
      updated_at: 'desc',
    },
    take: 5,
  });

  if (failedTasks.length === 0) {
    console.log('  (Không có task nào bị thất bại)');
  } else {
    failedTasks.forEach(t => {
      const dateStr = t.date.toISOString().split('T')[0];
      console.log(`  - [ID: ${t.id}] Ngày: ${dateStr} | Chi nhánh: ${t.branch_name} | Loại: ${t.type}`);
      console.log(`    Lỗi: ${t.error_message}`);
      console.log(`    Cập nhật lúc: ${t.updated_at.toISOString()}`);
    });
  }
  console.log('');

  // 4. Số lượng thực tế các bảng ghi nhận được trong DB của ngày 12/06/2026
  console.log('4. THỐNG KÊ BẢN GHI THỰC TẾ TRONG DATABASE NGÀY 12/06/2026:');
  const start12 = new Date('2026-06-12T00:00:00.000Z');
  const end12 = new Date('2026-06-12T23:59:59.999Z');

  const appointmentsCount = await prisma.appointment.count({
    where: {
      appointment_date: {
        gte: start12,
        lte: end12,
      },
    },
  });

  const revenueCount = await prisma.revenueTransaction.count({
    where: {
      date: {
        gte: start12,
        lte: end12,
      },
    },
  });

  const customersCount = await prisma.customer.count({
    where: {
      created_at: {
        gte: start12,
        lte: end12,
      },
    },
  });

  console.log(`  - Lịch hẹn (Appointments): ${appointmentsCount}`);
  console.log(`  - Giao dịch Doanh thu (Revenue Transactions): ${revenueCount}`);
  console.log(`  - Khách hàng mới (Customers): ${customersCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
