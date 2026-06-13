import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@100.111.97.70:12003/db_tazagroup_vttech_sync"
    }
  }
});

async function main() {
  const latestTimona = await prisma.appointment.findFirst({
    where: {
      branch: {
        name: {
          contains: 'Timona',
          mode: 'insensitive'
        }
      }
    },
    orderBy: {
      appointment_date: 'desc'
    },
    select: {
      appointment_date: true,
      branch_name: true
    }
  });

  const oldestTimona = await prisma.appointment.findFirst({
    where: {
      branch: {
        name: {
          contains: 'Timona',
          mode: 'insensitive'
        }
      }
    },
    orderBy: {
      appointment_date: 'asc'
    },
    select: {
      appointment_date: true,
      branch_name: true
    }
  });

  console.log("=== TIMONA DATE RANGE ===");
  console.log("Oldest Timona appointment:", oldestTimona);
  console.log("Latest Timona appointment:", latestTimona);

  // Check appointments count on June 12, 2026
  const start = new Date("2026-06-12T00:00:00Z");
  const end = new Date("2026-06-12T23:59:59Z");
  const countOnDate = await prisma.appointment.count({
    where: {
      appointment_date: {
        gte: start,
        lte: end
      },
      branch: {
        name: {
          contains: 'Timona',
          mode: 'insensitive'
        }
      }
    }
  });
  console.log("Timona appointments count on 2026-06-12:", countOnDate);

  // Let's count Timona appointments grouped by month/year or just recent dates
  const recentDays = await prisma.appointment.findMany({
    where: {
      branch: {
        name: {
          contains: 'Timona',
          mode: 'insensitive'
        }
      }
    },
    orderBy: {
      appointment_date: 'desc'
    },
    take: 10,
    select: {
      id: true,
      appointment_date: true,
      branch_name: true,
      customer_name: true
    }
  });
  console.log("\n=== RECENT 10 TIMONA APPOINTMENTS ===");
  console.log(recentDays);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
