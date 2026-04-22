
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  console.log(`🚀 Bắt đầu tạo task cho ${branches.length} chi nhánh...`);

  const startDate = new Date('2019-01-01');
  const endDate = new Date('2026-04-21');
  
  let currentDay = new Date(startDate);
  let totalTasks = 0;

  while (currentDay <= endDate) {
    const dateStr = currentDay.toISOString().split('T')[0];
    const syncDate = new Date(dateStr);
    
    console.log(`📅 Đang xử lý ngày: ${dateStr}`);
    
    for (const branch of branches) {
      try {
        // Kiểm tra xem đã có task chưa
        const existing = await prisma.syncTask.findFirst({
          where: {
            branch_id: branch.id,
            date: syncDate,
            type: 'HEADER'
          }
        });

        if (!existing) {
          await prisma.syncTask.create({
            data: {
              date: syncDate,
              branch_id: branch.id,
              branch_name: branch.name,
              type: 'HEADER',
              status: 'PENDING',
              records_count: 0
            }
          });
          totalTasks++;
        }
      } catch (e) {
        console.error(`  ❌ Lỗi tại ${branch.name} - ${dateStr}: ${e.message}`);
      }
    }
    
    currentDay.setDate(currentDay.getDate() + 1);
  }

  console.log(`✅ Hoàn tất! Đã tạo thêm ${totalTasks} task mới.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
