import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany({
    where: {
      name: { contains: 'tư vấn', mode: 'insensitive' }
    }
  });
  console.log(`Found ${services.length} services with "tư vấn" in name.`);
  services.forEach(s => {
    console.log(`ID: ${s.id} | Name: ${s.name} | Group ID: ${s.group_id}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
