import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function count() {
  console.log('--- 📊 SỐ LƯỢNG BẢN GHI CHI TIẾT ---');
  
  const [
    anamnesis,
    images,
    imageFolders,
    care,
    complaint,
    plans,
    customers
  ] = await Promise.all([
    prisma.customerAnamnesis.count(),
    prisma.customerImage.count(),
    prisma.customerImageFolder.count(),
    prisma.customerCareHistory.count(),
    prisma.customerComplaint.count(),
    prisma.customerTreatmentPlan.count(),
    prisma.customer.count()
  ]);

  console.log(`- Khách hàng: ${customers}`);
  console.log(`- Tiền sử (Anamnesis): ${anamnesis}`);
  console.log(`- Thư mục ảnh (ImageFolders): ${imageFolders}`);
  console.log(`- Ảnh (Images): ${images}`);
  console.log(`- Lịch sử tư vấn (Care History): ${care}`);
  console.log(`- Khiếu nại (Complaint): ${complaint}`);
  console.log(`- Phác đồ điều trị (Treatment Plans): ${plans}`);

  await prisma.$disconnect();
}

count();
