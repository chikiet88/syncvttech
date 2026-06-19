import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Updating appointment 776160 created_by_id to 167...');
  const res = await prisma.appointment.update({
    where: { id: 776160 },
    data: { created_by_id: 167 }
  });
  console.log('Updated record:', JSON.stringify(res, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
