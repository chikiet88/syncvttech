import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@100.111.97.70:12003/db_tazagroup_vttech_sync"
    }
  }
});

async function main() {
  // Query successful tasks and compute their actual execution time in seconds
  const successTasks = await prisma.syncTask.findMany({
    where: {
      status: 'SUCCESS',
      last_run_at: { not: null }
    },
    orderBy: { updated_at: 'desc' },
    take: 100,
    select: {
      last_run_at: true,
      updated_at: true
    }
  });

  let totalDurationMs = 0;
  let count = 0;

  successTasks.forEach(task => {
    if (task.last_run_at && task.updated_at) {
      const diff = task.updated_at.getTime() - task.last_run_at.getTime();
      if (diff > 0 && diff < 300000) { // filter out tasks that took more than 5 minutes
        totalDurationMs += diff;
        count++;
      }
    }
  });

  const avgDurationSeconds = count > 0 ? (totalDurationMs / count) / 1000 : 8; // fallback 8 seconds

  const remainingCount = await prisma.syncTask.count({
    where: {
      status: { in: ['PENDING', 'QUEUED', 'PROCESSING', 'FAILED'] }
    }
  });

  const concurrency = 4;
  const estimatedSeconds = (remainingCount * avgDurationSeconds) / concurrency;

  console.log("=== ACCURATE SPEED AUDIT FROM SYNC_TASKS ===");
  console.log(`- Sample size: ${count} successful tasks`);
  console.log(`- Real Average Duration: ${avgDurationSeconds.toFixed(2)} seconds per task`);
  console.log(`- Remaining Tasks: ${remainingCount}`);
  console.log(`- Concurrency: ${concurrency} parallel workers`);
  
  const minutes = estimatedSeconds / 60;
  console.log(`- Estimated completion time: ${minutes.toFixed(2)} minutes (~${(minutes / 60).toFixed(2)} hours)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
