import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CronConfig Records ===');
  const configs = await prisma.cronConfig.findMany({
    orderBy: { id: 'asc' },
  });
  console.log(JSON.stringify(configs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
