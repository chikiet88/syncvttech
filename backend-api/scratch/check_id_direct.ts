import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:12003/db_tazagroup_vttech_sync"
    }
  }
});

async function main() {
  const customer = await prisma.customer.findUnique({
    where: { id: 118913 }
  });
  console.log('Customer 118913:', customer);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
