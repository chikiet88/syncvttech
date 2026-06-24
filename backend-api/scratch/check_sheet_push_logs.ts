import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING GOOGLE SHEET PUSH CRON LOGS ===");

  const logs = await prisma.crawlLog.findMany({
    where: {
      crawl_type: 'handleGoogleSheetPushCron'
    },
    orderBy: {
      created_at: 'desc'
    },
    take: 10
  });

  console.log(`Found ${logs.length} Google Sheet push logs:`);
  for (const log of logs) {
    console.log(`- Date: ${log.created_at.toISOString()} | Status: ${log.status} | Msg: ${log.message} | Recs: ${log.records_count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
