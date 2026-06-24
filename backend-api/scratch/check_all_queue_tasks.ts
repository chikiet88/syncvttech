import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const connection = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  const queue = new Queue('sync-queue', { connection });
  console.log("=== SCANNING QUEUE AND DB FOR ORPHANED TASKS ===");

  // 1. Get all incomplete tasks from DB
  const dbTasks = await prisma.syncTask.findMany({
    where: {
      status: { in: ['PROCESSING', 'QUEUED'] }
    }
  });
  console.log(`Found ${dbTasks.length} tasks in PROCESSING or QUEUED state in DB.`);

  // 2. Fetch all jobs in the queue
  // BullMQ might have a lot of jobs, so we'll check by ID pattern or scan Redis
  const activeJobs = await queue.getActive();
  const prioritizedJobs = await queue.getJobs(['prioritized']);
  const waitingJobs = await queue.getWaiting();
  const delayedJobs = await queue.getDelayed();

  console.log(`Active jobs: ${activeJobs.length}`);
  console.log(`Prioritized jobs: ${prioritizedJobs.length}`);
  console.log(`Waiting jobs: ${waitingJobs.length}`);
  console.log(`Delayed jobs: ${delayedJobs.length}`);

  // Create a set of parent task IDs that have jobs in the queue
  const taskIdsInQueue = new Set<number>();

  const processJob = (job: any) => {
    if (!job) return;
    // Job ID format: detail-customerId-task-taskId or hist-task-taskId
    const id = job.id || '';
    let match = id.match(/task-(\d+)/);
    if (match) {
      taskIdsInQueue.add(parseInt(match[1]));
    }
  };

  activeJobs.forEach(processJob);
  prioritizedJobs.forEach(processJob);
  waitingJobs.forEach(processJob);
  delayedJobs.forEach(processJob);

  console.log(`Total unique Task IDs with active/prioritized/waiting/delayed jobs in queue: ${taskIdsInQueue.size}`);

  // 3. Identify orphaned tasks
  const orphanedTasks = dbTasks.filter(t => !taskIdsInQueue.has(t.id));
  console.log(`Found ${orphanedTasks.length} orphaned tasks (PROCESSING/QUEUED in DB but 0 jobs in queue).`);

  if (orphanedTasks.length > 0) {
    console.log("\nOrphaned tasks list:");
    for (const t of orphanedTasks) {
      const dateStr = t.date.toISOString().split('T')[0];
      console.log(`- ID: ${t.id} | Date: ${dateStr} | Branch: ${t.branch_name} | Status: ${t.status} | Completed: ${t.completed_details}/${t.total_details}`);
    }

    console.log("\nResetting orphaned tasks to PENDING...");
    for (const t of orphanedTasks) {
      await prisma.syncTask.update({
        where: { id: t.id },
        data: {
          status: 'PENDING',
          updated_at: new Date(),
          error_message: 'Hệ thống tự động phát hiện kẹt hàng đợi và reset (Self-healing Orphaned).'
        }
      });
      console.log(`- Reset task ${t.id} to PENDING.`);
    }
    console.log("🎉 Reset completed!");
  } else {
    console.log("\n🎉 No orphaned tasks found! All tasks in DB have matching jobs in the queue.");
  }

  connection.disconnect();
  await prisma.$disconnect();
}

main().catch(console.error);
