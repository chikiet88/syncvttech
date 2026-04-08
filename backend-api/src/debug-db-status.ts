
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const today = new Date('2026-04-07');
  const tomorrow = new Date('2026-04-08');

  console.log('--- Checking Database for 2026-04-07 ---');

  const branchesCount = await prisma.branch.count();
  console.log('Total Branches:', branchesCount);

  const dailyCustomers = await prisma.dailyCustomer.count({
    where: { date: { gte: today, lt: tomorrow } }
  });
  console.log('Daily Customers (2026-04-07):', dailyCustomers);

  const appointments = await prisma.appointment.count({
    where: { appointment_date: { gte: today, lt: tomorrow } }
  });
  console.log('Appointments (2026-04-07):', appointments);

  const treatments = await prisma.treatment.count({
    where: { treatment_date: { gte: today, lt: tomorrow } }
  });
  console.log('Treatments (2026-04-07):', treatments);

  const revenueTransactions = await prisma.revenueTransaction.count({
    where: { date: { gte: today, lt: tomorrow } }
  });
  console.log('Revenue Transactions (2026-04-07):', revenueTransactions);

  const serviceTransactions = await prisma.revenueTransaction.count({
    where: { 
      date: { gte: today, lt: tomorrow },
      service_id: { not: null }
    }
  });
  console.log('Service Transactions (2026-04-07):', serviceTransactions);

  const syncTasks = await prisma.syncTask.findMany({
    where: { date: { gte: today, lt: tomorrow } }
  });
  console.log('Sync Tasks for today:', syncTasks.length);
  syncTasks.forEach(task => {
    console.log(`- Branch ${task.branch_id} (${task.branch_name}): Status ${task.status}, Reg: ${task.customers_count}, Sale: ${task.sales_total}, Rev: ${task.revenue_total}`);
  });

  const crawlLogs = await prisma.crawlLog.findMany({
    where: { created_at: { gte: new Date('2026-04-07T00:00:00Z') } },
    orderBy: { created_at: 'desc' },
    take: 10
  });
  console.log('Recent Crawl Logs:', crawlLogs.length);
  crawlLogs.forEach(log => {
      console.log(`- ${log.created_at}: ${log.crawl_type} - ${log.status} - ${log.records_count} records`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
