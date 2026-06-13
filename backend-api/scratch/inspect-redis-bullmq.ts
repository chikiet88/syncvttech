import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const connection = {
  host: process.env.REDIS_HOST || '100.111.97.70',
  port: parseInt(process.env.REDIS_PORT || '12004'),
  password: process.env.REDIS_PASSWORD || undefined,
};

async function main() {
  console.log(`Connecting to Redis directly at ${connection.host}:${connection.port}...`);
  const redis = new Redis(connection);

  try {
    const keys = await redis.keys('*');
    console.log(`Total keys in Redis: ${keys.length}`);
    console.log('Sample keys (up to 30):');
    for (const key of keys.slice(0, 30)) {
      const type = await redis.type(key);
      console.log(`- ${key} (${type})`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    redis.disconnect();
  }
}

main();
