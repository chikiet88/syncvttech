
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const start = new Date('2026-04-01T00:00:00');
  const end = new Date('2026-04-04T23:59:59');

  const [revCount, appCount, treatCount, custCount] = await Promise.all([
    prisma.revenueTransaction.count({ where: { date: { gte: start, lte: end } } }),
    prisma.appointment.count({ where: { appointment_date: { gte: start, lte: end } } }),
    prisma.treatment.count({ where: { treatment_date: { gte: start, lte: end } } }),
    prisma.dailyCustomer.count({ where: { date: { gte: start, lte: end } } }),
  ]);

  console.log('--- Database Stats (01/04 - 04/04) ---');
  console.log('Revenue Transactions:', revCount);
  console.log('Appointments:', appCount);
  console.log('Treatments:', treatCount);
  console.log('Daily Customers:', custCount);

  if (revCount > 0) {
    const first = await prisma.revenueTransaction.findFirst({ where: { date: { gte: start, lte: end } } });
    console.log('First Revenue Record:', JSON.stringify(first, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
