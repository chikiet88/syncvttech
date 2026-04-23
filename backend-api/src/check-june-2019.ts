
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.revenueTransaction.count({
    where: {
      date: {
        gte: new Date('2019-06-01'),
        lte: new Date('2019-06-30 23:59:59'),
      }
    }
  });

  const sample = await prisma.revenueTransaction.findMany({
    where: {
      date: {
        gte: new Date('2019-06-01'),
        lte: new Date('2019-06-30 23:59:59'),
      }
    },
    take: 5
  });

  console.log(`Revenue Transactions for June 2019: ${count}`);
  if (sample.length > 0) {
    console.log('Sample record:', JSON.stringify(sample[0]));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
