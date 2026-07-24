import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  console.log('🔍 Kiểm tra danh sách Chi nhánh (Branch) trong Database:');
  const branches = await prisma.branch.findMany();
  console.table(branches.map(b => ({ id: b.id, name: b.name, company_id: (b as any).company_id })));

  console.log('\n📊 Thống kê số lượng Lịch hẹn năm 2026 theo từng Chi nhánh:');
  const startDate = new Date('2026-01-01T00:00:00.000Z');
  const endDate = new Date('2026-12-31T23:59:59.999Z');

  const apptCounts = await prisma.appointment.groupBy({
    by: ['branch_id'],
    where: {
      appointment_date: { gte: startDate, lte: endDate }
    },
    _count: { id: true }
  });

  const branchMap = new Map(branches.map(b => [b.id, b.name]));
  const result = apptCounts.map(c => ({
    branch_id: c.branch_id,
    branch_name: c.branch_id ? branchMap.get(c.branch_id) : 'Chưa phân chi nhánh',
    count_2026: c._count.id
  }));

  console.table(result);

  await prisma.$disconnect();
}

main().catch(console.error);
