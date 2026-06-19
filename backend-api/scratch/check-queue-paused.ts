import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function main() {
  const connection = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  const queue = new Queue('sync-queue', { connection });

  const isPaused = await queue.isPaused();
  console.log(`Queue isPaused: ${isPaused}`);

  if (isPaused) {
    console.log("Queue is paused! Resuming...");
    await queue.resume();
    console.log("Queue resumed!");
  } else {
    console.log("Queue is not paused.");
  }

  // Let's also check if there is any other issue with the queue.
  const workers = await queue.getWorkers();
  console.log(`Registered workers count: ${workers.length}`);
  for (const w of workers) {
    console.log(`- Worker ID: ${w.id}`);
  }

  connection.disconnect();
}

main().catch(console.error);
