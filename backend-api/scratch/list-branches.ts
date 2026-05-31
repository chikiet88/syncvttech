import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    orderBy: { id: 'asc' },
  });
  console.log('All Branches in Database:', branches);
  await prisma.$disconnect();
}

main().catch(console.error);
