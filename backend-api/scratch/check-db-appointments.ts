import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const minDateWithCreator = await prisma.appointment.aggregate({
    where: {
      appointment_date: {
        gte: new Date('2026-01-01T00:00:00.000Z'),
      },
      created_by_id: {
        not: null,
      },
    },
    _min: {
      appointment_date: true,
    },
  });

  console.log('--- KẾT QUẢ ĐỒNG BỘ HỒI QUY (LỊCH HẸN CÓ NGƯỜI TẠO) ---');
  console.log('Ngày xa nhất đã được đồng bộ có người tạo:', minDateWithCreator._min.appointment_date);

  // Thống kê theo ngày của Tháng 5 và Tháng 6/2026 để xem có bị đứt đoạn không
  console.log('\nThống kê Tháng 6 (13 ngày đầu):');
  for (let i = 13; i >= 1; i--) {
    const dayStr = `2026-06-${String(i).padStart(2, '0')}`;
    const start = new Date(`${dayStr}T00:00:00.000Z`);
    const end = new Date(`${dayStr}T23:59:59.999Z`);
    
    const total = await prisma.appointment.count({
      where: { appointment_date: { gte: start, lte: end } }
    });
    
    const withCreator = await prisma.appointment.count({
      where: {
        appointment_date: { gte: start, lte: end },
        created_by_id: { not: null }
      }
    });

    console.log(`  Ngày ${dayStr}: Có Sale ${withCreator}/${total} (${total > 0 ? Math.round((withCreator / total) * 100) : 0}%)`);
  }

  console.log('\nThống kê Tháng 5 (Chọn một số ngày để mẫu):');
  const sampleDays = ['2026-05-31', '2026-05-25', '2026-05-20', '2026-05-15', '2026-05-10', '2026-05-01'];
  for (const dayStr of sampleDays) {
    const start = new Date(`${dayStr}T00:00:00.000Z`);
    const end = new Date(`${dayStr}T23:59:59.999Z`);
    
    const total = await prisma.appointment.count({
      where: { appointment_date: { gte: start, lte: end } }
    });
    
    const withCreator = await prisma.appointment.count({
      where: {
        appointment_date: { gte: start, lte: end },
        created_by_id: { not: null }
      }
    });

    console.log(`  Ngày ${dayStr}: Có Sale ${withCreator}/${total} (${total > 0 ? Math.round((withCreator / total) * 100) : 0}%)`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
