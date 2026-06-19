import IORedis from 'ioredis';

async function main() {
  const redis = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  const keys = [
    'bull:sync-queue:detail-167964-task-290694:lock',
    'bull:sync-queue:detail-172884-task-290694:lock',
    'bull:sync-queue:detail-174976-task-290694:lock',
    'bull:sync-queue:detail-195258-task-290694:lock',
  ];

  for (const k of keys) {
    const exists = await redis.exists(k);
    const ttl = await redis.ttl(k);
    const val = await redis.get(k);
    console.log(`Key: ${k}, Exists: ${exists}, TTL: ${ttl}, Value: ${val}`);
  }

  // Let's scan all lock keys in redis
  const pattern = 'bull:sync-queue:*:lock';
  let cursor = '0';
  const lockKeys: string[] = [];
  do {
    const [nextCursor, found] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    lockKeys.push(...found);
  } while (cursor !== '0');

  console.log(`\nFound total ${lockKeys.length} lock keys in Redis:`);
  for (const lk of lockKeys) {
    const ttl = await redis.ttl(lk);
    const val = await redis.get(lk);
    console.log(`- Lock: ${lk}, TTL: ${ttl}, Owner: ${val}`);
  }

  redis.disconnect();
}

main().catch(console.error);
