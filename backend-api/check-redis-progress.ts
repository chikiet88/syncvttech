import IORedis from 'ioredis';

async function check() {
  const redis = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  console.log('--- 🛡️ REAL-TIME DETAIL SYNC PROGRESS (REDIS) ---');
  
  const keys = await redis.keys('sync:task:*:stats');
  console.log(`Found ${keys.length} active task progress keys in Redis:`);
  
  for (const key of keys) {
    const taskId = key.split(':')[2];
    const stats = await redis.hgetall(key);
    console.log(`- Task ID: ${taskId} | Completed: ${stats.completed || 0}/${stats.total || '?'}`);
  }

  redis.disconnect();
}

check();
