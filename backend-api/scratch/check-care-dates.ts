import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:12003/db_tazagroup_vttech_sync"
    }
  }
});

async function main() {
  const latestCare = await prisma.customerCareHistory.findMany({
    where: {
      action_date: { not: null }
    },
    orderBy: { action_date: 'desc' },
    take: 10,
    select: {
      id: true,
      customer_id: true,
      action_date: true,
      action_type: true,
      note: true
    }
  });

  console.log('Top 10 latest Care History records:');
  for (const item of latestCare) {
    console.log(`- ID: ${item.id}, CustID: ${item.customer_id}, Date: ${item.action_date ? item.action_date.toISOString() : 'NULL'}, Type: ${item.action_type}, Note: ${item.note?.substring(0, 50)}`);
  }

  // Count Care History records with action_date in the year 2026
  const count2026 = await prisma.customerCareHistory.count({
    where: {
      action_date: {
        gte: new Date('2026-01-01T00:00:00Z'),
        lte: new Date('2026-12-31T23:59:59Z')
      }
    }
  });
  console.log(`\nTotal Care History records in 2026: ${count2026}`);

  // Find any records on June 1st, 2026
  const june1stCount = await prisma.customerCareHistory.count({
    where: {
      action_date: {
        gte: new Date('2026-06-01T00:00:00Z'),
        lte: new Date('2026-06-01T23:59:59Z')
      }
    }
  });
  console.log(`june 1st count: ${june1stCount}`);

  await prisma.$disconnect();
}

main().catch(console.error);
