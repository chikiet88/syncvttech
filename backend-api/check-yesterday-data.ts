import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:12003/db_tazagroup_vttech_sync"
    }
  }
});

async function check() {
  console.log('--- 📊 KIỂM TRA DỮ LIỆU HÔM QUA (2026-06-01) ---');
  
  const start = new Date('2026-06-01T00:00:00.000Z');
  const end = new Date('2026-06-01T23:59:59.999Z');

  const [
    anamnesis,
    imageFolders,
    care,
    complaint,
    plans
  ] = await Promise.all([
    prisma.customerAnamnesis.count({ where: { created_at: { gte: start, lte: end } } }),
    prisma.customerImageFolder.count({ where: { created_at: { gte: start, lte: end } } }),
    prisma.customerCareHistory.count({ where: { action_date: { gte: start, lte: end } } }),
    prisma.customerComplaint.count({ where: { created_at: { gte: start, lte: end } } }),
    prisma.customerTreatmentPlan.count({ where: { created_at: { gte: start, lte: end } } })
  ]);

  console.log(`- Tiền sử (Anamnesis): ${anamnesis}`);
  console.log(`- Thư mục ảnh (ImageFolders): ${imageFolders}`);
  console.log(`- Tư vấn (Care History): ${care}`);
  console.log(`- Complaint (Khiếu nại): ${complaint}`);
  console.log(`- Chẩn đoán (Treatment Plans): ${plans}`);

  await prisma.$disconnect();
}

check();
