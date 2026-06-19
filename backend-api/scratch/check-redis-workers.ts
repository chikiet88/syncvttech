import IORedis from 'ioredis';

async function main() {
  const redis = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  // scan keys matching *workers* or check client list
  const clientList = await (redis as any).client('list');
  console.log("Redis Client List count:", String(clientList).split('\n').length);
  
  // check keys
  const pattern = 'bull:sync-queue:*';
  let cursor = '0';
  const keys: string[] = [];
  do {
    const [nextCursor, found] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...found);
  } while (cursor !== '0');

  console.log(`\nFound ${keys.length} queue keys:`);
  for (const k of keys) {
    const type = await redis.type(k);
    if (k.endsWith(':id') || k.endsWith(':events') || k.endsWith(':meta')) {
       console.log(`- ${k} (${type})`);
    } else if (type === 'hash' || type === 'zset' || type === 'set') {
       const size = type === 'hash' ? await redis.hlen(k) : type === 'zset' ? await redis.zcard(k) : await redis.scard(k);
       console.log(`- ${k} (${type}, size: ${size})`);
    }
  }

  redis.disconnect();
}

main().catch(console.error);
