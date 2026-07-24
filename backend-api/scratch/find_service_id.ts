import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const query = process.argv[2] || 'DA CHUYÊN SÂU';
  console.log(`Searching for master services matching: "${query}"`);
  
  const services = await prisma.service.findMany({
    where: {
      name: {
        contains: query,
        mode: 'insensitive'
      }
    }
  });

  services.forEach(s => {
    console.log(`- ID: ${s.id}, Code: ${s.code}, Name: ${s.name}, Price: ${s.price}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
