import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('--- 📊 KIỂM TRA HOẠT ĐỘNG SYNC GẦN ĐÂY (10 PHÚT QUA) ---');
  
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const [
    anamnesis,
    imageFolders,
    images,
    care,
    complaint,
    plans,
    serviceTabs,
    payments
  ] = await Promise.all([
    prisma.customerAnamnesis.count({ where: { synced_at: { gte: tenMinutesAgo } } }),
    prisma.customerImageFolder.count({ where: { synced_at: { gte: tenMinutesAgo } } }),
    prisma.customerImage.count({ where: { synced_at: { gte: tenMinutesAgo } } }),
    prisma.customerCareHistory.count({ where: { synced_at: { gte: tenMinutesAgo } } }),
    prisma.customerComplaint.count({ where: { synced_at: { gte: tenMinutesAgo } } }),
    prisma.customerTreatmentPlan.count({ where: { synced_at: { gte: tenMinutesAgo } } }),
    prisma.customerServiceTab.count({ where: { synced_at: { gte: tenMinutesAgo } } }),
    prisma.customerPayment.count({ where: { synced_at: { gte: tenMinutesAgo } } })
  ]);

  console.log(`- Tiền sử (Anamnesis): ${anamnesis}`);
  console.log(`- Thư mục ảnh (ImageFolders): ${imageFolders}`);
  console.log(`- Ảnh (Images): ${images}`);
  console.log(`- Tư vấn (Care History): ${care}`);
  console.log(`- Complaint (Khiếu nại): ${complaint}`);
  console.log(`- Chẩn đoán (Treatment Plans): ${plans}`);
  console.log(`- Dịch vụ (Service Tabs): ${serviceTabs}`);
  console.log(`- Thanh toán (Payments): ${payments}`);

  await prisma.$disconnect();
}

check();
