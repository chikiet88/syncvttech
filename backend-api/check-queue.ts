import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function check() {
  console.log('🔄 Đang kiểm tra hàng đợi BullMQ...');
  const redis = new IORedis({
    host: 'localhost',
    port: 26379,
  });

  const queue = new Queue('sync-queue', { connection: redis });
  const counts = await queue.getJobCounts();
  console.log('Counts:', counts);

  const active = await queue.getActive();
  console.log('Active jobs count:', active.length);
  if (active.length > 0) {
    console.log('Sample active job:', active[0].id, active[0].name, active[0].data);
  }

  const waiting = await queue.getWaiting();
  console.log('Waiting jobs count:', waiting.length);
  if (waiting.length > 0) {
    console.log('Sample waiting job:', waiting[0].id, waiting[0].name, waiting[0].data);
  }

  redis.disconnect();
}

check();
