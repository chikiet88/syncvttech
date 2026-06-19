import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.crawlLog.findMany({
    where: {
      crawl_type: { in: ['handleGoogleSheetPushCron', 'DAILY_REPORT'] }
    },
    orderBy: { created_at: 'desc' },
    take: 10
  });
  console.log('CRON LOGS:');
  console.log(JSON.stringify(logs, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
