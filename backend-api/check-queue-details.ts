import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function check() {
  console.log('🔄 Đang kết nối Redis...');
  const redis = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  const queue = new Queue('sync-queue', { connection: redis });
  
  // Lấy các job đang active
  const active = await queue.getActive();
  console.log(`Active jobs (${active.length}):`);
  active.forEach(j => {
    console.log(`- ID: ${j.id}, Name: ${j.name}, Data:`, j.data);
  });

  // Lấy 20 job prioritized đầu tiên
  const prioritized = await queue.getJobs(['prioritized'], 0, 20);
  console.log(`\nSample prioritized jobs (${prioritized.length}):`);
  prioritized.forEach(j => {
    console.log(`- ID: ${j.id}, Name: ${j.name}, Data:`, j.data);
  });

  redis.disconnect();
}

check();
