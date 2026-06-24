import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function main() {
  const connection = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  const queue = new Queue('sync-queue', { connection });
  console.log("=== INSPECTING STUCK TASKS IN QUEUE ===");

  const targetIds = [310087, 310067, 310068, 310070, 310051, 310056, 310053, 310033, 310016, 310017];
  
  const active = await queue.getActive();
  const prioritized = await queue.getJobs(['prioritized']);
  const waiting = await queue.getWaiting();

  console.log(`Active queue size: ${active.length}`);
  console.log(`Prioritized queue size: ${prioritized.length}`);
  console.log(`Waiting queue size: ${waiting.length}`);

  for (const id of targetIds) {
    const act = active.filter(j => j.id?.includes(`task-${id}`));
    const pri = prioritized.filter(j => j.id?.includes(`task-${id}`));
    const wat = waiting.filter(j => j.id?.includes(`task-${id}`));
    
    console.log(`- Task ${id}: Active: ${act.length} | Prioritized: ${pri.length} | Waiting: ${wat.length}`);
  }

  connection.disconnect();
}

main().catch(console.error);
