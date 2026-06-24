import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function main() {
  const connection = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  const queue = new Queue('sync-queue', { connection });
  console.log("=== INSPECTING BULLMQ FOR TASK 287939 ===");

  // Check jobs in active, waiting, prioritized, failed
  const active = await queue.getActive();
  const prioritized = await queue.getJobs(['prioritized']);
  const waiting = await queue.getWaiting();
  const failed = await queue.getFailed();

  console.log(`Active jobs: ${active.length}`);
  const activeMatched = active.filter(j => j.id?.includes('task-287939'));
  console.log(`Matched in active: ${activeMatched.length}`);
  activeMatched.forEach(j => console.log(`- Job ID: ${j.id}, State: active`));

  console.log(`Prioritized jobs in queue: ${prioritized.length}`);
  const prioritizedMatched = prioritized.filter(j => j.id?.includes('task-287939'));
  console.log(`Matched in prioritized: ${prioritizedMatched.length}`);
  prioritizedMatched.forEach(j => console.log(`- Job ID: ${j.id}, State: prioritized`));

  console.log(`Waiting jobs: ${waiting.length}`);
  const waitingMatched = waiting.filter(j => j.id?.includes('task-287939'));
  console.log(`Matched in waiting: ${waitingMatched.length}`);
  waitingMatched.forEach(j => console.log(`- Job ID: ${j.id}, State: waiting`));

  console.log(`Failed jobs: ${failed.length}`);
  const failedMatched = failed.filter(j => j.id?.includes('task-287939'));
  console.log(`Matched in failed: ${failedMatched.length}`);
  failedMatched.forEach(j => console.log(`- Job ID: ${j.id}, State: failed, Reason: ${j.failedReason}`));

  connection.disconnect();
}

main().catch(console.error);
