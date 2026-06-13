import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const ids = [198615, 198616, 198623];
  console.log('--- 🔍 DETAILED RECORDS FOR SYNCED CUSTOMERS ---');
  
  for (const id of ids) {
    const [
      cust,
      anamnesis,
      imageFolders,
      images,
      care,
      complaint,
      plans,
      serviceTabs,
      payments
    ] = await Promise.all([
      prisma.customer.findUnique({ where: { id } }),
      prisma.customerAnamnesis.findMany({ where: { customer_id: id } }),
      prisma.customerImageFolder.findMany({ where: { customer_id: id } }),
      prisma.customerImage.findMany({ where: { folder: { customer_id: id } } }),
      prisma.customerCareHistory.findMany({ where: { customer_id: id } }),
      prisma.customerComplaint.findMany({ where: { customer_id: id } }),
      prisma.customerTreatmentPlan.findMany({ where: { customer_id: id } }),
      prisma.customerServiceTab.findMany({ where: { customer_id: id } }),
      prisma.customerPayment.findMany({ where: { customer_id: id } })
    ]);

    console.log(`\nCustomer ID: ${id} | Name: ${cust?.name || 'N/A'}`);
    console.log(`- Tiền sử (Anamnesis): ${anamnesis.length}`);
    console.log(`- Thư mục ảnh (ImageFolders): ${imageFolders.length}`);
    console.log(`- Ảnh (Images): ${images.length}`);
    console.log(`- Tư vấn (Care History): ${care.length}`);
    console.log(`- Complaint (Khiếu nại): ${complaint.length}`);
    console.log(`- Chẩn đoán (Treatment Plans): ${plans.length}`);
    console.log(`- Dịch vụ (Service Tabs): ${serviceTabs.length}`);
    console.log(`- Thanh toán (Payments): ${payments.length}`);
  }

  await prisma.$disconnect();
}

check();
