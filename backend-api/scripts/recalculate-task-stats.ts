import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bắt đầu tính toán lại các chỉ số cho SyncTask (Ver 2)...');

  // Lấy tất cả các Header Task có số liệu bằng 0 hoặc cần cập nhật
  const tasks = await prisma.syncTask.findMany({
    where: { 
        type: 'HEADER',
        // Chỉ cập nhật các task thành công
        status: { in: ['SUCCESS', 'PROCESSING'] }
    }
  });
  
  console.log(`🔍 Tìm thấy ${tasks.length} tasks cần cập nhật.`);

  for (const task of tasks) {
    const start = new Date(task.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(task.date);
    end.setHours(23, 59, 59, 999);

    console.log(`📊 Xử lý: ${task.branch_name} (${task.date.toISOString().split('T')[0]})`);

    // 1. Phải lấy danh sách khách hàng có mặt trong ngày đó tại chi nhánh đó
    // Dữ liệu này nằm trong bảng daily_customers
    const dailyCustomers = await (prisma as any).dailyCustomer.findMany({
      where: {
        branch_id: task.branch_id,
        date: { gte: start, lte: end }
      },
      select: { customer_id: true }
    });

    const customerIds = dailyCustomers.map((dc: any) => dc.customer_id);

    if (customerIds.length === 0) {
      console.log(`   🔸 Không tìm thấy danh sách khách hàng chi tiết cho ngày này.`);
      continue;
    }

    // 2. Đếm dịch vụ của các khách hàng này
    const servicesCount = await prisma.customerServiceTab.count({
      where: {
        customer_id: { in: customerIds }
      }
    });

    // 3. Đếm điều trị của các khách hàng này
    const treatmentsCount = await prisma.customerTreatmentPlan.count({
      where: {
        customer_id: { in: customerIds }
      }
    });
    
    // 4. Đếm lịch hẹn
    const appointmentsCount = await prisma.appointment.count({
      where: {
        branch_id: task.branch_id,
        appointment_date: { gte: start, lte: end }
      }
    });

    // 5. Cập nhật vào SyncTask
    await prisma.syncTask.update({
      where: { id: task.id },
      data: {
        services_count: servicesCount,
        treatments_count: treatmentsCount,
        appointments_count: appointmentsCount,
        customers_count: customerIds.length,
        updated_at: new Date()
      } as any
    });

    console.log(`   ✅ Cập nhật xong: KH (${customerIds.length}), Dịch vụ (${servicesCount}), Điều trị (${treatmentsCount})`);
  }

  console.log('✨ Hoàn thành!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
