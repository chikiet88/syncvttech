import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error('❌ Please provide a phone number.');
    process.exit(1);
  }

  console.log(`=== Inspecting Customer with phone: ${phone} ===`);
  const customers = await prisma.customer.findMany({
    where: { phone: { contains: phone } }
  });

  if (customers.length === 0) {
    console.log('Customer not found.');
    await prisma.$disconnect();
    return;
  }

  for (const c of customers) {
    console.log(`\nCustomer ID: ${c.id}, Code: ${c.code}, Name: ${c.name}, Phone: ${c.phone}, BranchID: ${c.branch_id}, Created: ${c.created_at}`);
    
    const payments = await prisma.customerPayment.findMany({
      where: { customer_id: c.id },
      orderBy: { id: 'asc' }
    });
    console.log(`Payments found: ${payments.length}`);
    payments.forEach((p: any) => {
      console.log(`  - ID: ${p.id}, PaymentID: ${p.payment_id}, Code: ${p.payment_code}, Amount: ${p.amount}, Date: ${p.payment_date}, Method: ${p.payment_method}, BranchID: ${p.branch_id}, Note: "${p.note}"`);
    });

    const services = await prisma.customerServiceTab.findMany({
      where: { customer_id: c.id },
      orderBy: { id: 'asc' }
    });
    console.log(`Services found: ${services.length}`);
    services.forEach((s: any) => {
      console.log(`  - ID: ${s.id}, ServiceID: ${s.service_id}, Name: ${s.service_name}, Price: ${s.price}, Quantity: ${s.quantity}, Total: ${s.total}, Paid: ${s.totalpaid}, Debt: ${s.totaldebt}, Status: ${s.status}, Created: ${s.created_at}`);
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
