import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@100.111.97.70:12003/db_tazagroup_vttech_sync"
    }
  }
});

async function main() {
  const startDate = new Date('2026-01-01T00:00:00Z');
  const endDate = new Date('2026-06-12T23:59:59Z');

  const tasksSummary = await prisma.syncTask.groupBy({
    by: ['status'],
    where: {
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    _count: {
      _all: true
    }
  });

  const missingDates: string[] = [];
  const daysWithTasks = await prisma.syncTask.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    select: { date: true },
    distinct: ['date']
  });

  const uniqueTaskDates = new Set(daysWithTasks.map(d => d.date.toISOString().split('T')[0]));
  let current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    if (!uniqueTaskDates.has(dateStr)) {
      missingDates.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }

  const taskProgress = await prisma.syncTask.aggregate({
    where: { date: { gte: startDate, lte: endDate } },
    _sum: {
      total_details: true,
      completed_details: true
    }
  });

  console.log("=== UPDATED SYNCHRONIZATION STATUS ===");
  console.log("Tasks Status Breakdown:");
  tasksSummary.forEach(item => {
    console.log(`- Status ${item.status}: ${item._count._all} tasks`);
  });

  console.log(`\nMissing Date Gaps: ${missingDates.length === 0 ? 'None (Perfect)' : `${missingDates.length} gaps`}`);
  if (missingDates.length > 0) {
    console.log("Missing dates:", missingDates);
  }
  
  const totalDetails = taskProgress._sum.total_details || 0;
  const completedDetails = taskProgress._sum.completed_details || 0;
  const detailsPercentage = totalDetails > 0 ? (completedDetails / totalDetails) * 100 : 0;
  console.log(`\nDetails Sync Progress: ${completedDetails}/${totalDetails} (${detailsPercentage.toFixed(2)}%)`);

  // Thêm thống kê ngày lớn nhất/nhỏ nhất
  const apptStats = await prisma.appointment.aggregate({
    _max: {
      appointment_date: true,
    },
    _min: {
      appointment_date: true,
    }
  });

  const apptWithCreatorStats = await prisma.appointment.aggregate({
    where: {
      created_by_id: { not: null }
    },
    _max: {
      appointment_date: true,
    },
    _min: {
      appointment_date: true,
    }
  });

  console.log(`\n--- DB DATE RANGE ---`);
  console.log(`Appointment date range: ${apptStats._min.appointment_date?.toISOString()} -> ${apptStats._max.appointment_date?.toISOString()}`);
  console.log(`Appointment with creator range: ${apptWithCreatorStats._min.appointment_date?.toISOString()} -> ${apptWithCreatorStats._max.appointment_date?.toISOString()}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
