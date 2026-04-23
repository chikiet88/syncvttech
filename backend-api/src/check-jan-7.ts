
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.revenueTransaction.count({
    where: {
      date: {
        gte: new Date('2019-01-07'),
        lte: new Date('2019-01-07 23:59:59'),
      }
    }
  });

  console.log(`Revenue Transactions for 2019-01-07: ${count}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
