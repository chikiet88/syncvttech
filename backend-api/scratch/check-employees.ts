import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const empCount = await prisma.employee.count();
  const userCount = await prisma.user.count();
  console.log(`Employees in DB: ${empCount}`);
  console.log(`Users in DB: ${userCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
