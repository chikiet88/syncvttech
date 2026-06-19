import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@100.111.97.70:12003/db_tazagroup_vttech_sync"
    }
  }
});

async function main() {
  const task = await prisma.syncTask.findUnique({
    where: { id: 290694 }
  });
  console.log("Stuck Task details:", JSON.stringify(task, null, 2));

  // Let's also check if the customers are in the DB
  const cIds = [167964, 172884, 174976, 195258];
  const customers = await prisma.customer.findMany({
    where: { id: { in: cIds } }
  });
  console.log("\nStuck Customers details:");
  for (const c of customers) {
    console.log(`- ID: ${c.id}, Name: ${c.name}, Phone: ${c.phone}, Code: ${c.code}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
