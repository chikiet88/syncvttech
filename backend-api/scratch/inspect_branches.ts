import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    orderBy: {
      id: 'asc',
    },
  });
  console.log('Branches in DB:');
  branches.forEach(b => {
    console.log(`  - ID: ${b.id}, Code: ${b.code}, Name: ${b.name}`);
  });
  await prisma.$disconnect();
}

main().catch(console.error);
