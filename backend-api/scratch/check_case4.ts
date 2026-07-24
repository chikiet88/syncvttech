import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const customerId = 190686;

  console.log(`=== Inspecting DB fields for customer ${customerId} ===`);
  const serviceTabs = await prisma.customerServiceTab.findMany({
    where: { customer_id: customerId },
    orderBy: { id: 'asc' }
  });

  console.log('Service Tabs:');
  serviceTabs.forEach(s => {
    console.log(JSON.stringify(s, null, 2));
  });

  const payments = await prisma.customerPayment.findMany({
    where: { customer_id: customerId },
    orderBy: { id: 'asc' }
  });

  console.log('Payments:');
  payments.forEach(p => {
    console.log(JSON.stringify(p, null, 2));
  });

  await prisma.$disconnect();
}

main().catch(console.error);
