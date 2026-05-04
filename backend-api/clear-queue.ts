
import { Redis } from 'ioredis';

async function clearQueue() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'shared-redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });

  const pattern = 'bull:sync-queue:*';
  let cursor = '0';
  let totalDeleted = 0;

  console.log(`🧹 Searching for keys matching ${pattern}...`);

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;

    if (keys.length > 0) {
      await redis.del(...keys);
      totalDeleted += keys.length;
      console.log(`🗑️ Deleted ${keys.length} keys... (Total: ${totalDeleted})`);
    }
  } while (cursor !== '0');

  console.log(`✅ Finished. Deleted ${totalDeleted} keys.`);
  process.exit(0);
}

clearQueue().catch(err => {
  console.error('❌ Error clearing queue:', err);
  process.exit(1);
});
