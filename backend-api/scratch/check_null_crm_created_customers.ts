import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Analyzing Customers with Null crm_created_at ---');

  const totalNullCrm = await prisma.customer.count({
    where: { crm_created_at: null }
  });
  console.log(`Total customers with crm_created_at = null: ${totalNullCrm}`);

  const defaultBdayCount = await prisma.customer.count({
    where: {
      crm_created_at: null,
      birthday: {
        lt: new Date('1905-01-01')
      }
    }
  });
  console.log(`Customers with default/1900 birthday: ${defaultBdayCount}`);

  const realBdayCount = await prisma.customer.count({
    where: {
      crm_created_at: null,
      birthday: {
        gte: new Date('1905-01-01')
      }
    }
  });
  console.log(`Customers with potentially real birthday (>= 1905): ${realBdayCount}`);

  // Let's sample 10 of these customers with potentially real birthdays
  const samples = await prisma.customer.findMany({
    where: {
      crm_created_at: null,
      birthday: {
        gte: new Date('1905-01-01')
      }
    },
    take: 10,
    select: {
      id: true,
      name: true,
      phone: true,
      birthday: true,
      created_at: true
    }
  });

  console.log('\nSamples of customers with null crm_created_at but valid birthday:');
  for (const s of samples) {
    console.log(`  - ID: ${s.id} | Name: ${s.name} | Phone: ${s.phone} | Birthday: ${s.birthday ? s.birthday.toISOString() : 'NULL'} | Synced At: ${s.created_at.toISOString()}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
