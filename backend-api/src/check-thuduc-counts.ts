
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dateStr = '2026-04-22';
  const start = new Date(dateStr);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  const branchId = 1; // Taza Thủ Đức
  console.log(`Checking customers for Branch ${branchId} on ${dateStr}...`);

  const daily = await prisma.dailyCustomer.findMany({ where: { branch_id: branchId, date: { gte: start, lte: end } } });
  const appts = await prisma.appointment.findMany({ where: { branch_id: branchId, appointment_date: { gte: start, lte: end } } });
  const treats = await prisma.treatment.findMany({ where: { branch_id: branchId, treatment_date: { gte: start, lte: end } } });
  const trans = await prisma.revenueTransaction.findMany({ where: { branch_id: branchId, date: { gte: start, lte: end } } });

  console.log(`DailyCustomers: ${daily.length}`);
  console.log(`Appointments: ${appts.length}`);
  console.log(`Treatments: ${treats.length}`);
  console.log(`Transactions: ${trans.length}`);

  const allIds = new Set([
      ...daily.map(d => d.customer_id),
      ...appts.map(a => a.customer_id).filter(Boolean),
      ...treats.map(t => t.customer_id).filter(Boolean),
      ...trans.map(t => t.customer_id).filter(Boolean)
  ]);
  console.log(`Total Unique Customer IDs: ${allIds.size}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
