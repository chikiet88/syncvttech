import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const cases = [
  { num: 2, phone: '0945276301', name: 'TRẦN MỸ HẰNG' },
  { num: 3, phone: '0384594170', name: 'NGUYỄN QUỐC TRUNG' },
  { num: 4, phone: '0383513098', name: 'TRỊNH MỸ TIÊN' },
  { num: 5, phone: '0901416027', name: 'NGUYỄN NGỌC PHƯƠNG' },
  { num: 6, phone: '0789246668', name: 'HÀ THỊ NGỌC BÍCH' },
  { num: 7, phone: '0393239368', name: 'LÊ THỤC OANH' }
];

async function main() {
  for (const c of cases) {
    console.log(`\n=============================================`);
    console.log(`CASE #${c.num}: ${c.name} (${c.phone})`);
    console.log(`=============================================`);

    const customers = await prisma.customer.findMany({
      where: { phone: { contains: c.phone } }
    });

    if (customers.length === 0) {
      console.log(`❌ Customer not found in local DB.`);
      continue;
    }

    for (const cust of customers) {
      console.log(`Customer: Name = ${cust.name}, Code = ${cust.code}, ID (DB) = ${cust.id}`);
      
      const serviceTabs = await prisma.customerServiceTab.findMany({
        where: { customer_id: cust.id },
        orderBy: { id: 'asc' }
      });
      console.log(`Service Tabs (${serviceTabs.length}):`);
      serviceTabs.forEach((s: any) => {
        console.log(`  - ID: ${s.id}, ServiceID: ${s.service_id}, Name: ${s.service_name}, Price: ${s.price}, Quantity: ${s.quantity}, Total: ${s.total}, Paid: ${s.totalpaid}, Debt: ${s.totaldebt}, Status: ${s.status}, Created: ${s.created_at}`);
      });

      const payments = await prisma.customerPayment.findMany({
        where: { customer_id: cust.id },
        orderBy: { id: 'asc' }
      });
      console.log(`Payments (${payments.length}):`);
      payments.forEach((p: any) => {
        console.log(`  - ID: ${p.id}, PaymentID: ${p.payment_id}, Code: ${p.payment_code}, Amount: ${p.amount}, Date: ${p.payment_date}, Method: ${p.payment_method}, BranchID: ${p.branch_id}, Note: ${p.note}`);
      });
    }
  }
  await prisma.$disconnect();
}

main().catch(console.error);
