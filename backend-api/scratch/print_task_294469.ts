import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const task = await prisma.syncTask.findUnique({
    where: { id: 294469 }
  });
  console.log('Task 294469 Details:');
  console.log(JSON.stringify(task, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
