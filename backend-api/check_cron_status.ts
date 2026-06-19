import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('=== 🕒 CHECKING CRON CONFIG & LOGS ===');
  
  // 1. Cron configurations
  const configs = await prisma.cronConfig.findMany();
  console.log('\n--- Cron Configurations ---');
  configs.forEach(c => {
    console.log(`- ID: ${c.id}`);
    console.log(`  Name: ${c.name}`);
    console.log(`  Enabled: ${c.enabled}`);
    console.log(`  Updated At: ${c.updated_at.toISOString()}`);
  });

  // 2. Latest Crawl Logs
  console.log('\n--- Latest 15 Crawl Logs ---');
  const logs = await prisma.crawlLog.findMany({
    orderBy: { created_at: 'desc' },
    take: 15
  });
  
  logs.forEach(l => {
    console.log(`- [${l.created_at.toISOString()}] Type: ${l.crawl_type}, Status: ${l.status}, Msg: ${l.message}, Count: ${l.records_count}, Err: ${l.error_message}`);
  });

  // 3. Check if appointments were synced or modified today
  console.log('\n--- Sync Tasks for Today (2026-06-17) ---');
  const todayStart = new Date('2026-06-17T00:00:00.000Z');
  const todayEnd = new Date('2026-06-17T23:59:59.999Z');
  const todayTasks = await prisma.syncTask.findMany({
    where: {
      updated_at: { gte: todayStart, lte: todayEnd }
    },
    orderBy: { updated_at: 'desc' },
    take: 10
  });
  todayTasks.forEach(t => {
    console.log(`- [${t.updated_at.toISOString()}] BranchID: ${t.branch_id}, Date: ${t.date.toISOString().split('T')[0]}, Type: ${t.type}, Status: ${t.status}`);
  });

  await prisma.$disconnect();
}

check().catch(console.error);
