import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Using DATABASE_URL:', process.env.DATABASE_URL);

const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findUnique({
    where: { id: 118913 }
  });
  console.log('Customer 118913:', customer);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
