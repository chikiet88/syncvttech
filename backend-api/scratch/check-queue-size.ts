import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function main() {
  const connection = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  const queue = new Queue('sync-queue', { connection });

  console.log('Checking BullMQ queue counts on port 26380...');
  const counts = await queue.getJobCounts();
  console.log('Job counts:', counts);

  // Let's get active jobs
  const activeJobs = await queue.getActive();
  console.log('Number of active jobs:', activeJobs.length);
  if (activeJobs.length > 0) {
    console.log('Active jobs samples:');
    activeJobs.slice(0, 5).forEach(j => {
      console.log(`- Job ID: ${j.id}, Type: ${j.data.type}, Data:`, JSON.stringify(j.data.data), `Timestamp: ${new Date(j.timestamp).toISOString()}`);
    });
  }

  // Let's get waiting jobs
  const waitingJobs = await queue.getWaiting();
  console.log('Number of waiting jobs:', waitingJobs.length);

  connection.disconnect();
}

main().catch(console.error);
