import { Redis } from 'ioredis';

async function clearQueue() {
  const redis = new Redis({
    host: '100.111.97.70',
    port: 26380,
  });

  const pattern = 'bull:sync-queue:*';
  let cursor = '0';
  let totalDeleted = 0;

  console.log(`🧹 Searching for keys matching ${pattern} on port 26380 (Real Active Redis)...`);

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
  redis.disconnect();
}

clearQueue().catch(err => {
  console.error('❌ Error clearing queue:', err);
});
