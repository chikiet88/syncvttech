
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dateStr = '2026-04-22';
  const start = new Date(dateStr);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  const branchId = 6; // Đà Nẵng
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

  // Check for duplicates based on content
  const groups = new Map();
  transactions.forEach(t => {
      const key = `${t.customer_id}-${t.service_id}-${t.amount}-${t.paid}-${t.created_at.toISOString()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
  });

  for (const [key, group] of Array.from(groups.entries())) {
      if ((group as any[]).length > 1) {
          console.log(`Duplicate found (${(group as any[]).length} times): ${key}`);
          (group as any[]).forEach((t: any) => console.log(`  ID: ${t.id}`));
      }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
