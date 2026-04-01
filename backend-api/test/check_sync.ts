import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSync() {
  console.log('--- Latest 5 CrawlLogs ---');
  const lastLogs = await prisma.crawlLog.findMany({
    take: 5,
    orderBy: { crawl_date: 'desc' }
  });
  
  lastLogs.forEach(log => {
    console.log(`[${log.crawl_date.toISOString()}] Type: ${log.crawl_type}, Status: ${log.status}, Count: ${log.records_count}`);
  });

  const datesToCheck = ['2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31'];
  
  console.log('--- Database Summary ---');
  const totalDailyRevenue = await prisma.dailyRevenue.count();
  const totalRevenueTransaction = await prisma.revenueTransaction.count();
  const totalDailyCustomer = await prisma.dailyCustomer.count();
  const totalAppointment = await prisma.appointment.count();
  const totalTreatment = await prisma.treatment.count();
  const latestTreatment = await prisma.treatment.findFirst({
    orderBy: { treatment_date: 'desc' }
  });
  const totalCrawlLog = await prisma.crawlLog.count();
  console.log(`- Total DailyRevenue records: ${totalDailyRevenue}`);
  console.log(`- Total RevenueTransaction records: ${totalRevenueTransaction}`);
  console.log(`- Total DailyCustomer records: ${totalDailyCustomer}`);
  console.log(`- Total Appointment records: ${totalAppointment}`);
  console.log(`- Total Treatment records: ${totalTreatment}`);
  if (latestTreatment && latestTreatment.treatment_date) {
    console.log(`- Latest Treatment date: ${latestTreatment.treatment_date.toISOString()}`);
  } else if (latestTreatment) {
    console.log(`- Latest Treatment found but date is NULL`);
  }
  console.log(`- Total CrawlLog records: ${totalCrawlLog}\n`);

  console.log('--- Checking Synchronization Status by Date ---\n');

  for (const dateStr of datesToCheck) {
    const start = new Date(dateStr + 'T00:00:00.000Z');
    const end = new Date(dateStr + 'T23:59:59.999Z');

    const dailyRevenueCount = await prisma.dailyRevenue.count({
      where: { date: { gte: start, lte: end } }
    });

    const revenueTransactionCount = await prisma.revenueTransaction.count({
      where: { date: { gte: start, lte: end } }
    });

    const dailyCustomerCount = await prisma.dailyCustomer.count({
      where: { date: { gte: start, lte: end } }
    });

    const treatmentCount = await prisma.treatment.count({
      where: { treatment_date: { gte: start, lte: end } }
    });

    const crawlLogCount = await prisma.crawlLog.count({
      where: { crawl_date: { gte: start, lte: end } }
    });

    console.log(`Date: ${dateStr}`);
    console.log(`  - DailyRevenue: ${dailyRevenueCount}`);
    console.log(`  - RevenueTransaction: ${revenueTransactionCount}`);
    console.log(`  - DailyCustomer: ${dailyCustomerCount}`);
    console.log(`  - Treatment (Today): ${treatmentCount}`);
    console.log(`  - CrawlLog: ${crawlLogCount}`);
    console.log('-----------------------------------');
  }

  // Also check if there are any errors in the last CrawlLogs
  const recentErrors = await prisma.crawlLog.findMany({
    where: { 
      status: 'error',
      crawl_date: { gte: new Date('2026-03-25T00:00:00.000Z') }
    },
    take: 10,
    orderBy: { crawl_date: 'desc' }
  });

  if (recentErrors.length > 0) {
    console.log('\n--- Recent Sync Errors ---');
    recentErrors.forEach(err => {
      console.log(`[${err.crawl_date.toISOString()}] ${err.crawl_type}: ${err.error_message}`);
    });
  } else {
    console.log('\nNo sync errors found for the requested period.');
  }

  await prisma.$disconnect();
}

checkSync();
