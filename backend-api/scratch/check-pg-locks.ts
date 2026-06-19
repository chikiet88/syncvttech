import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@100.111.97.70:12003/db_tazagroup_vttech_sync"
    }
  }
});

async function main() {
  console.log("Checking active queries in PG...");
  const activeQueries = await prisma.$queryRawUnsafe<any[]>(`
    SELECT pid, query, state, query_start, state_change,
           age(clock_timestamp(), query_start) as duration,
           wait_event_type, wait_event
    FROM pg_stat_activity 
    WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%'
    ORDER BY duration DESC;
  `);

  console.log(`Found ${activeQueries.length} active queries:`);
  for (const q of activeQueries) {
    console.log(`- PID: ${q.pid}, State: ${q.state}, Duration: ${q.duration}, WaitEvent: ${q.wait_event_type}:${q.wait_event}`);
    console.log(`  Query: ${q.query}`);
  }

  console.log("\nChecking for database locks...");
  const locks = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      blocked_locks.pid     AS blocked_pid,
      blocked_activity.usename  AS blocked_user,
      blocked_activity.query    AS blocked_statement,
      blocking_locks.pid    AS blocking_pid,
      blocking_activity.usename AS blocking_user,
      blocking_activity.query   AS blocking_statement
    FROM  pg_catalog.pg_locks         blocked_locks
    JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
    JOIN pg_catalog.pg_locks         blocking_locks 
        ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
    JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
    WHERE NOT blocked_locks.granted;
  `);

  console.log(`Found ${locks.length} locks:`);
  for (const l of locks) {
    console.log(`Blocked PID ${l.blocked_pid} is waiting for Blocking PID ${l.blocking_pid}`);
    console.log(`Blocked Statement: ${l.blocked_statement}`);
    console.log(`Blocking Statement: ${l.blocking_statement}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
