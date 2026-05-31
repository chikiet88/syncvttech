import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRaw<any[]>`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'appointments'
  `;
  console.log('Columns in appointments table:', columns);
  await prisma.$disconnect();
}

main().catch(console.error);
