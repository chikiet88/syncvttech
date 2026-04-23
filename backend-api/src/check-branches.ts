
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany();
  console.log('--- BRANCHES ---');
  branches.forEach(b => {
    console.log(`ID: ${b.id} | Name: ${b.name}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
