import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';

async function clearAndReset() {
  console.log('🔄 Connecting to Redis on port 26380 (Real Active Redis)...');
  const redis = new Redis({
    host: '100.111.97.70',
    port: 26380,
  });

  const pattern = 'bull:sync-queue:*';
  let cursor = '0';
  let totalDeleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;

    if (keys.length > 0) {
      await redis.del(...keys);
      totalDeleted += keys.length;
      console.log(`🗑️ Deleted ${keys.length} keys... (Total: ${totalDeleted})`);
    }
  } while (cursor !== '0');

  console.log(`✅ Redis cleanup finished. Deleted ${totalDeleted} keys.`);
  redis.disconnect();

  console.log('🔄 Connecting to Postgres Database...');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:postgres@100.111.97.70:12003/db_tazagroup_vttech_sync"
      }
    }
  });

  console.log('🧹 Resetting tasks with status PROCESSING, QUEUED, or FAILED back to PENDING...');
  const result = await prisma.syncTask.updateMany({
    where: {
      status: { in: ['PROCESSING', 'QUEUED', 'FAILED'] }
    },
    data: {
      status: 'PENDING',
      completed_details: 0,
      total_details: 0,
      error_message: null
    }
  });

  console.log(`✅ Database reset finished. Reset ${result.count} tasks.`);
  await prisma.$disconnect();
  console.log('🎉 All done!');
}

clearAndReset().catch(err => {
  console.error('❌ Error during clear and reset:', err);
});
