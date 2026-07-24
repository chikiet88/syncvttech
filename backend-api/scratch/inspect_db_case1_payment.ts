import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== SEARCHING FOR PAYMENT CODE: PTSTPTZ20260506.11 ===');
  
  // 1. Search in CustomerPayment table (using note or something similar, or check all payments)
  // Let's filter by note or other text since code/payment_id is not exactly doc_code
  const payments = await prisma.customerPayment.findMany({
    where: {
      note: {
        contains: 'PTSTPTZ20260506.11',
      },
    },
  });
  console.log('Payments found in CustomerPayment:', payments);

  // 2. Search in RevenueTransaction table using doc_code or note
  const transactions = await prisma.revenueTransaction.findMany({
    where: {
      doc_code: {
        contains: 'PTSTPTZ20260506.11',
      },
    },
  });
  console.log('Transactions found in RevenueTransaction:', transactions);

  // 3. Search in CustomerPayment using amount or date
  // May 6, 2026, amount 500,000 (06-05-2026)
  const paymentsByAmount = await prisma.customerPayment.findMany({
    where: {
      amount: 500000,
      payment_date: {
        gte: new Date('2026-05-05T00:00:00Z'),
        lte: new Date('2026-05-07T23:59:59Z'),
      },
    },
  });
  console.log('Payments of 500,000 around 2026-05-06:', paymentsByAmount);

  // 4. Search in RevenueTransaction using amount or date
  const transByAmount = await prisma.revenueTransaction.findMany({
    where: {
      paid: 500000,
      date: {
        gte: new Date('2026-05-05T00:00:00Z'),
        lte: new Date('2026-05-07T23:59:59Z'),
      },
    },
  });
  console.log('Transactions of 500,000 around 2026-05-06:', transByAmount);

  await prisma.$disconnect();
}

main().catch(console.error);
