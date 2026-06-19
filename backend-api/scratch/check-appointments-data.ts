import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@100.111.97.70:12003/db_tazagroup_vttech_sync"
    }
  }
});

async function main() {
  console.log("Checking total appointments count...");
  const total = await prisma.appointment.count();
  console.log("Total appointments:", total);

  const start = new Date('2026-06-13T00:00:00.000Z');
  const end = new Date('2026-06-15T23:59:59.999Z');

  console.log(`Checking appointments between 2026-06-13 and 2026-06-15...`);
  const rangeCount = await prisma.appointment.count({
    where: {
      appointment_date: {
        gte: start,
        lte: end
      }
    }
  });
  console.log("Appointments in range:", rangeCount);

  if (rangeCount > 0) {
    const samples = await prisma.appointment.findMany({
      where: {
        appointment_date: {
          gte: start,
          lte: end
        }
      },
      take: 5
    });
    console.log("Sample appointments:", JSON.stringify(samples, null, 2));

    // Let's count breakdown by status/status_name and type_name/service_name
    const allInRange = await prisma.appointment.findMany({
      where: {
        appointment_date: {
          gte: start,
          lte: end
        }
      },
      select: {
        status: true,
        status_name: true,
        type_name: true,
        service_name: true
      }
    });

    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const serviceCounts: Record<string, number> = {};

    for (const app of allInRange) {
      const statusKey = `${app.status} (${app.status_name || 'null'})`;
      statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
      
      const typeKey = app.type_name || 'null';
      typeCounts[typeKey] = (typeCounts[typeKey] || 0) + 1;

      const serviceKey = app.service_name || 'null';
      serviceCounts[serviceKey] = (serviceCounts[serviceKey] || 0) + 1;
    }

    console.log("Status counts:", statusCounts);
    console.log("Type counts:", typeCounts);
    console.log("Service counts:", serviceCounts);
  }

  // Also let's run a query of the exact filters used in report.controller.ts:
  const filteredCount = await prisma.appointment.count({
    where: {
      appointment_date: {
        gte: start,
        lte: end
      },
      AND: [
        {
          OR: [
            { status_name: { contains: 'Ra Về', mode: 'insensitive' } },
            {
              AND: [
                { OR: [{ status_name: null }, { status_name: '' }] },
                { OR: [{ status: 2 }, { status: 4 }] }
              ]
            }
          ]
        },
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
    }
  });
  console.log("Filtered appointments count in range:", filteredCount);

  await prisma.$disconnect();
}

main().catch(console.error);
