import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    include: {
      company: true
    }
  });

  console.log("=== Branches ===");
  for (const b of branches) {
    console.log(`ID: ${b.id}, Name: ${b.name}, Company ID: ${b.company_id}, Company: ${b.company?.name}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
