import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding customers with null or empty phone...');
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { phone: null },
        { phone: '' }
      ]
    }
  });

  console.log(`Found ${customers.length} customers with missing phone.`);
  
  if (customers.length > 0) {
    const ids = customers.map(c => c.id);
    console.log(`Updating updated_at for these customer IDs to 10 days ago:`, ids);
    
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const result = await prisma.customer.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        updated_at: tenDaysAgo
      }
    });
    console.log(`Successfully reset updated_at for ${result.count} customers.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
