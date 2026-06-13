import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const customerId = 192410;
  console.log(`--- 🔍 CARE HISTORY FOR CUSTOMER ${customerId} ---`);
  
  const care = await prisma.customerCareHistory.findMany({
    where: { customer_id: customerId }
  });

  console.log(`Found ${care.length} records:`);
  care.forEach(c => {
    console.log(`- History ID: ${c.history_id} | Action Date: ${c.action_date?.toISOString()} | Synced At: ${c.synced_at.toISOString()} | Type: ${c.action_type} | Note: ${c.note}`);
  });

  await prisma.$disconnect();
}

check();
