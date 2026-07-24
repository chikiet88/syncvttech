import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const paymentId = parseInt(process.argv[2]);
  if (isNaN(paymentId)) {
    console.error('❌ Please provide a valid payment_id as an argument.');
    process.exit(1);
  }

  console.log(`🧹 Deleting local payment record with payment_id = ${paymentId}...`);
  const result = await prisma.customerPayment.deleteMany({
    where: {
      payment_id: paymentId
    }
  });

  console.log(`✅ Deleted ${result.count} rows.`);
  await prisma.$disconnect();
}

main().catch(console.error);
