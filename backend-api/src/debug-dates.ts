
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Date Distribution Analysis ---');

  const dailyDates = await prisma.$queryRaw`
    SELECT date, count(*) 
    FROM daily_customers 
    GROUP BY date 
    ORDER BY date DESC 
    LIMIT 10
  `;
  console.log('Unique Dates in Daily Customers:', JSON.stringify(dailyDates, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

  const revenueDates = await prisma.$queryRaw`
    SELECT date, count(*) 
    FROM revenue_transactions 
    GROUP BY date 
    ORDER BY date DESC 
    LIMIT 10
  `;
  console.log('Unique Dates in Revenue Transactions:', JSON.stringify(revenueDates, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

  const syncTasks = await prisma.syncTask.findMany({
      where: { updated_at: { gte: new Date('2026-04-07T00:00:00Z') } },
      select: { id: true, date: true, branch_name: true, status: true, customers_count: true, revenue_total: true }
  });
  console.log('Sync Tasks updated today:', JSON.stringify(syncTasks, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
