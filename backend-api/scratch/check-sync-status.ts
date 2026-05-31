import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    orderBy: { id: 'asc' },
  });
  const branchMap = new Map(branches.map(b => [b.id, b.name]));

  console.log('Latest Appointment Date in DB by Branch:');
  const latestAppts = await prisma.appointment.groupBy({
    by: ['branch_id'],
    _max: {
      appointment_date: true,
    },
  });

  for (const item of latestAppts) {
    const name = branchMap.get(item.branch_id || 0) || `CN #${item.branch_id}`;
    console.log(`- ${name} (ID: ${item.branch_id}): ${item._max.appointment_date?.toISOString() || 'N/A'}`);
  }

  console.log('\nLatest Crawl Logs:');
  const logs = await prisma.crawlLog.findMany({
    take: 10,
    orderBy: { created_at: 'desc' },
  });
  for (const log of logs) {
    console.log(`- [${log.created_at.toISOString()}] Type: ${log.crawl_type}, Status: ${log.status}, Count: ${log.records_count}, Message: ${log.message || 'N/A'}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
