import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('revenue_transactions', 'id'), COALESCE(max(id), 1) + 1) FROM revenue_transactions;
    `);
    console.log('Sequence for revenue_transactions reset successfully!');
  } catch (e) {
    console.error('Failed to reset sequence:', e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
