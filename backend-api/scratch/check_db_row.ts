import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const code = 'C_T20260612.775892';
  
  const app = await prisma.appointment.findFirst({
    where: {
      vttech_code: code
    },
    include: {
      customer: true
    }
  });

  console.log('=== DB Record for Code ===');
  console.log(JSON.stringify(app, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
