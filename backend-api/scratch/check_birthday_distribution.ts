import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Birthday Value Distribution ---');
  
  // Date boundary: 2025-01-01
  const boundaryDate = new Date('2025-01-01T00:00:00.000Z');

  // Let's check the minimum and maximum birthday dates
  const minMax = await prisma.$queryRaw<any[]>`
    SELECT MIN(birthday) as min_bday, MAX(birthday) as max_bday
    FROM customers
    WHERE created_at >= ${boundaryDate}
  `;
  console.log('Min/Max birthdays for customers synced since 2025-01-01:', minMax);

  const minMaxCrm = await prisma.$queryRaw<any[]>`
    SELECT MIN(birthday) as min_bday, MAX(birthday) as max_bday
    FROM customers
    WHERE crm_created_at >= ${boundaryDate}
  `;
  console.log('Min/Max birthdays for customers created in CRM since 2025-01-01:', minMaxCrm);

  // Top 20 most common birthdays for customers synced since 2025-01-01
  const topBirthdays = await prisma.$queryRaw<any[]>`
    SELECT birthday, COUNT(*) as count
    FROM customers
    WHERE created_at >= ${boundaryDate}
    GROUP BY birthday
    ORDER BY count DESC
    LIMIT 20
  `;
  console.log('\nTop 20 most common birthday values (created_at >= 2025-01-01):');
  for (const row of topBirthdays) {
    console.log(`  - Birthday: ${row.birthday ? new Date(row.birthday).toISOString() : 'NULL'} | Count: ${row.count}`);
  }

  // Top 20 most common birthdays for customers created in CRM since 2025-01-01
  const topBirthdaysCrm = await prisma.$queryRaw<any[]>`
    SELECT birthday, COUNT(*) as count
    FROM customers
    WHERE crm_created_at >= ${boundaryDate}
    GROUP BY birthday
    ORDER BY count DESC
    LIMIT 20
  `;
  console.log('\nTop 20 most common birthday values (crm_created_at >= 2025-01-01):');
  for (const row of topBirthdaysCrm) {
    console.log(`  - Birthday: ${row.birthday ? new Date(row.birthday).toISOString() : 'NULL'} | Count: ${row.count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
