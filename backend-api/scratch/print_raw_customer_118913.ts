import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findUnique({
    where: { id: 118913 }
  });
  console.log(JSON.stringify(customer, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
