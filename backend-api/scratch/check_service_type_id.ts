import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const service = await prisma.service.findUnique({
    where: { id: 665 }
  });
  console.log('Service 665 details:', service);
  await prisma.$disconnect();
}

main().catch(console.error);
