
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dateStr = '2026-04-22';
  const start = new Date(dateStr);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  const branchId = 16; // Timona Gò Vấp
  console.log(`Checking transactions for Branch ${branchId} on ${dateStr}...`);

  const transactions = await prisma.revenueTransaction.findMany({
    where: {
      branch_id: branchId,
      date: { gte: start, lte: end }
    },
    orderBy: { created_at: 'asc' }
  });

  console.table(transactions.map(t => ({
    id: t.id,
    customer: t.customer_name,
    service: t.service_name,
    amount: t.amount,
    paid: t.paid,
    created: t.created_at,
    hash: t.last_hash
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
