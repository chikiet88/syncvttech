
import { Queue } from 'bullmq';
import { IORedis } from 'ioredis';

async function drain() {
  const connection = {
    host: 'shared-redis',
    port: 6379,
  };

  const queue = new Queue('sync-queue', { connection });

  console.log('🧹 Draining queue...');
  await queue.drain(true);
  
  console.log('🧹 Cleaning queue...');
  await queue.clean(0, 1000, 'active');
  await queue.clean(0, 1000, 'wait');
  await queue.clean(0, 1000, 'delayed');
  await queue.clean(0, 1000, 'failed');
  await queue.clean(0, 1000, 'completed');

  console.log('✅ Queue drained and cleaned.');
  await queue.close();
  process.exit(0);
}

drain().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
