import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function query() {
  const customerId = 198445;
  console.log(`--- 🔍 CHI TIẾT KHÁCH HÀNG ${customerId} ---`);

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      anamnesis: true,
      complaints: true,
      treatment_plans: true,
      care_history: true,
      image_folders: {
        include: {
          images: true
        }
      }
    }
  });

  if (!customer) {
    console.log('❌ Không tìm thấy khách hàng này trong database!');
  } else {
    console.log(`- Mã KH: ${customer.code}`);
    console.log(`- Tên KH: ${customer.name}`);
    console.log(`- Tiền sử (Anamnesis): ${customer.anamnesis.length} bản ghi`);
    customer.anamnesis.forEach(a => console.log(`  * [${a.created_at?.toISOString()}] ${a.content}: ${a.note}`));
    
    console.log(`- Thư mục ảnh: ${customer.image_folders.length} thư mục`);
    customer.image_folders.forEach(f => console.log(`  * ${f.folder_name} (ID: ${f.folder_id}) - ${f.images.length} ảnh`));

    console.log(`- Lịch sử tư vấn (Care History): ${customer.care_history.length} bản ghi`);
    customer.care_history.forEach(c => console.log(`  * [${c.action_date?.toISOString()}] ${c.action_type}: ${c.note}`));

    console.log(`- Khiếu nại (Complaints): ${customer.complaints.length} bản ghi`);
    customer.complaints.forEach(c => console.log(`  * [${c.created_at?.toISOString()}] [${c.status_name}] ${c.content}`));

    console.log(`- Phác đồ điều trị (Treatment Plans): ${customer.treatment_plans.length} bản ghi`);
    customer.treatment_plans.forEach(p => console.log(`  * ${p.service_name} (BS: ${p.doctor_name}) - ${p.note}`));
  }

  await prisma.$disconnect();
}

query();
