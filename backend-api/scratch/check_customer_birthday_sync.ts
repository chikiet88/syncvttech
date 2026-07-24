import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- DB Customer Birthday Sync Check ---');
  
  // Date boundary: 2025-01-01
  const boundaryDate = new Date('2025-01-01T00:00:00.000Z');

  // 1. Check based on 'created_at' (when the record was created/synced in our DB)
  console.log('\n1. Checking by created_at (synced date in our PostgreSQL):');
  const totalSynced = await prisma.customer.count({
    where: {
      created_at: {
        gte: boundaryDate
      }
    }
  });

  const syncedWithBirthday = await prisma.customer.count({
    where: {
      created_at: { gte: boundaryDate },
      birthday: { not: null }
    }
  });

  const syncedNoBirthday = await prisma.customer.count({
    where: {
      created_at: { gte: boundaryDate },
      birthday: null
    }
  });

  console.log(`Total customers synced since 2025-01-01: ${totalSynced}`);
  console.log(`  - With birthday: ${syncedWithBirthday} (${totalSynced ? ((syncedWithBirthday / totalSynced) * 100).toFixed(2) : 0}%)`);
  console.log(`  - Without birthday (NULL): ${syncedNoBirthday} (${totalSynced ? ((syncedNoBirthday / totalSynced) * 100).toFixed(2) : 0}%)`);

  // 2. Check based on 'crm_created_at' (CRM creation date)
  console.log('\n2. Checking by crm_created_at (CRM creation date):');
  const totalCrm = await prisma.customer.count({
    where: {
      crm_created_at: {
        gte: boundaryDate
      }
    }
  });

  const crmWithBirthday = await prisma.customer.count({
    where: {
      crm_created_at: { gte: boundaryDate },
      birthday: { not: null }
    }
  });

  const crmNoBirthday = await prisma.customer.count({
    where: {
      crm_created_at: { gte: boundaryDate },
      birthday: null
    }
  });

  console.log(`Total customers created in CRM since 2025-01-01: ${totalCrm}`);
  console.log(`  - With birthday: ${crmWithBirthday} (${totalCrm ? ((crmWithBirthday / totalCrm) * 100).toFixed(2) : 0}%)`);
  console.log(`  - Without birthday (NULL): ${crmNoBirthday} (${totalCrm ? ((crmNoBirthday / totalCrm) * 100).toFixed(2) : 0}%)`);

  // 3. Let's see some samples where birthday is null to see if detail sync was actually run
  console.log('\n3. Sampling 5 customers without birthday (by created_at >= 2025-01-01):');
  const samples = await prisma.customer.findMany({
    where: {
      created_at: { gte: boundaryDate },
      birthday: null
    },
    take: 5,
    select: {
      id: true,
      code: true,
      name: true,
      phone: true,
      created_at: true,
      crm_created_at: true,
      payments: { take: 1 },
      care_history: { take: 1 },
      appointments: { take: 1 }
    }
  });

  for (const s of samples) {
    // Check if they have associated payments, care history, or appointments which proves detail sync or activity
    const hasPayments = s.payments.length > 0;
    const hasCare = s.care_history.length > 0;
    const hasApp = s.appointments.length > 0;
    console.log(`  - ID: ${s.id} | Code: ${s.code} | Name: ${s.name} | Phone: ${s.phone} | Sync Date: ${s.created_at.toISOString()} | CRM Date: ${s.crm_created_at ? s.crm_created_at.toISOString() : 'NULL'} | Has Payments: ${hasPayments} | Has Care History: ${hasCare} | Has Appointments: ${hasApp}`);
  }

  // 4. Check if there are any daily customer activities in 2025/2026 without birthday
  console.log('\n4. Checking activity logs (daily_customers) since 2025-01-01:');
  const totalDaily = await prisma.dailyCustomer.count({
    where: {
      date: { gte: boundaryDate }
    }
  });

  const dailyWithBirthday = await prisma.dailyCustomer.count({
    where: {
      date: { gte: boundaryDate },
      birthday: { not: null }
    }
  });

  const dailyNoBirthday = await prisma.dailyCustomer.count({
    where: {
      date: { gte: boundaryDate },
      birthday: null
    }
  });

  console.log(`Total daily customer records since 2025-01-01: ${totalDaily}`);
  console.log(`  - With birthday: ${dailyWithBirthday} (${totalDaily ? ((dailyWithBirthday / totalDaily) * 100).toFixed(2) : 0}%)`);
  console.log(`  - Without birthday (NULL): ${dailyNoBirthday} (${totalDaily ? ((dailyNoBirthday / totalDaily) * 100).toFixed(2) : 0}%)`);

  await prisma.$disconnect();
}

main().catch(console.error);
