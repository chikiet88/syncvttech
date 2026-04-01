
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestDailyCustomer = await prisma.dailyCustomer.findFirst({
    orderBy: { date: 'desc' }
  });
  console.log('Latest DailyCustomer Date:', latestDailyCustomer?.date);

  const latestTransaction = await prisma.revenueTransaction.findFirst({
    orderBy: { date: 'desc' }
  });
  console.log('Latest RevenueTransaction Date:', latestTransaction?.date);

  const countsLast7Days = await prisma.$queryRaw`
    SELECT date, count(*) as count 
    FROM daily_customers 
    WHERE date > '2026-03-20'
    GROUP BY date 
    ORDER BY date DESC
  `;
  console.log('DailyCustomer counts (last few days):', countsLast7Days);
}

main().catch(console.error).finally(() => prisma.$disconnect());
