import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function scan() {
  const ports = [12004, 26380, 26379, 6379];
  const host = '100.111.97.70';

  for (const port of ports) {
    console.log(`📡 Trying host: ${host}, port: ${port}...`);
    const redis = new IORedis({
      host,
      port,
      connectTimeout: 2000,
    });

    try {
      const ping = await redis.ping();
      console.log(`   ✅ Connected! Ping response: ${ping}`);
      const keys = await redis.keys('bull:sync-queue:*');
      console.log(`   🔍 Found ${keys.length} sync-queue keys.`);
      if (keys.length > 0) {
        const queue = new Queue('sync-queue', { connection: redis });
        const counts = await queue.getJobCounts();
        console.log(`   📊 Job counts:`, counts);
      }
    } catch (e) {
      console.log(`   ❌ Connection failed: ${e.message}`);
    } finally {
      redis.disconnect();
    }
  }
}

scan();
