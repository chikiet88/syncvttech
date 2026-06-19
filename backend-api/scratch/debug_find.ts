import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const customerId = 118913;
  const existingCustomer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, updated_at: true }
  });
  console.log('existingCustomer:', existingCustomer);
  
  if (existingCustomer) {
    console.log('Time diff:', Date.now() - existingCustomer.updated_at.getTime());
    console.log('Limit:', 7 * 24 * 60 * 60 * 1000);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
