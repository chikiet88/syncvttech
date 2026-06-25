import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING DATABASE APPOINTMENTS FOR 2026-06-25 ===");
  
  // Parse date range: 2026-06-25T00:00:00 to 2026-06-25T23:59:59 in Asia/Ho_Chi_Minh
  // Asia/Ho_Chi_Minh is +7, so:
  // start: 2026-06-24T17:00:00.000Z
  // end: 2026-06-25T16:59:59.999Z
  const start = new Date('2026-06-24T17:00:00.000Z');
  const end = new Date('2026-06-25T16:59:59.999Z');

  // Let's query Taza appointments matching the criteria:
  // branch name contains "Taza"
  // status: "Ra Về" or equivalent
  // type: "Tư vấn"
  const dbTazaAppts = await prisma.appointment.findMany({
    where: {
      appointment_date: {
        gte: start,
        lte: end
      },
      branch: {
        name: { contains: 'Taza', mode: 'insensitive' }
      },
      // Status filter matching excel-export.service.ts
      OR: [
        { status_name: { contains: 'Ra Về', mode: 'insensitive' } },
        {
          AND: [
            { OR: [{ status_name: null }, { status_name: '' }] },
            { OR: [{ status: 2 }, { status: 4 }] }
          ]
        }
      ],
      // Type filter matching excel-export.service.ts
      AND: [
        {
          OR: [
            { type_name: { contains: 'tư vấn', mode: 'insensitive' } },
            {
              AND: [
                { OR: [{ type_name: null }, { type_name: '' }] },
                { service_name: { contains: 'tư vấn', mode: 'insensitive' } }
              ]
            }
          ]
        }
      ]
    },
    orderBy: {
      appointment_date: 'asc'
    }
  });

  console.log(`Database filtered Taza appointments on 2026-06-25: ${dbTazaAppts.length}`);
  if (dbTazaAppts.length > 0) {
    console.log("Last 5 in DB:");
    dbTazaAppts.slice(-5).forEach(a => {
      console.log(`- Code: ${a.vttech_code} | Cust: ${a.customer_name} | Date: ${a.appointment_date?.toISOString()} | Status: ${a.status_name}`);
    });
  }

  // Let's also check ALL Taza appointments on June 25 (without filter) just to see what the count is
  const dbAllTazaAppts = await prisma.appointment.count({
    where: {
      appointment_date: {
        gte: start,
        lte: end
      },
      branch: {
        name: { contains: 'Taza', mode: 'insensitive' }
      }
    }
  });
  console.log(`Total Taza appointments on 2026-06-25 (all statuses/types): ${dbAllTazaAppts}`);

  await prisma.$disconnect();
}

main().catch(console.error);
