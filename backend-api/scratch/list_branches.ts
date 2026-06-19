import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== BRANCH LIST ===');
  const branches = await prisma.branch.findMany({
    orderBy: { id: 'asc' }
  });
  branches.forEach(b => {
    console.log(`ID: ${b.id} | Code: ${b.code} | Name: ${b.name} | Active: ${b.is_active}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
