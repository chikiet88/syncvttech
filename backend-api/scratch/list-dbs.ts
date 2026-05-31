import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const dbs = await prisma.$queryRaw<any[]>`
    SELECT datname FROM pg_database WHERE datistemplate = false
  `;
  console.log('Databases:', dbs);
  await prisma.$disconnect();
}

main().catch(console.error);
