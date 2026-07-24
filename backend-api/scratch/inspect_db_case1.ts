import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== SEARCHING FOR CUSTOMER: 0365759603 ===');
  
  // Find customer
  const customers = await prisma.customer.findMany({
    where: {
      phone: {
        contains: '0365759603',
      },
    },
  });

  console.log('Customers found in DB:', customers);

  if (customers.length === 0) {
    console.log('No customer found with phone 0365759603');
    await prisma.$disconnect();
    return;
  }

  for (const customer of customers) {
    const customerId = customer.id;
    console.log(`\n=== CUSTOMER ID: ${customerId} (${customer.name}) ===`);

    // Find payments
    const payments = await prisma.customerPayment.findMany({
      where: {
        customer_id: customerId,
      },
      orderBy: {
        id: 'desc',
      },
    });
    console.log(`Payments found (${payments.length}):`);
    payments.forEach((p: any) => {
      console.log(`  - ID: ${p.id}, PaymentID (from API): ${p.payment_id}, Amount: ${p.amount}, Date: ${p.payment_date}, Method: ${p.payment_method}, Note: ${p.note}, BranchID: ${p.branch_id}, Synced: ${p.synced_at}`);
    });

    // Find service tabs / services
    const serviceTabs = await prisma.customerServiceTab.findMany({
      where: {
        customer_id: customerId,
      },
      orderBy: {
        id: 'desc',
      },
    });
    console.log(`Service Tabs / Course services found (${serviceTabs.length}):`);
    serviceTabs.forEach((s: any) => {
      console.log(`  - ID: ${s.id}, ServiceID: ${s.service_id}, Name: ${s.service_name}, Price: ${s.price}, Quantity: ${s.quantity}, Total: ${s.total}, Discount: ${s.discount}, Created: ${s.created_at}, Status: ${s.status}`);
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
