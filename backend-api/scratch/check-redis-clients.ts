import IORedis from 'ioredis';

async function main() {
  const redis = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  const clientList = await (redis as any).client('list');
  const clients = String(clientList).split('\n').filter(Boolean);
  
  console.log(`Redis Clients (${clients.length}):`);
  for (const c of clients) {
    // Parse client string, e.g. "id=3 addr=127.0.0.1:54322 fd=7 name= age=10 idle=0 flags=N db=0 sub=0 psub=0 multi=-1 qbuf=0 qbuf-free=20474 obl=0 oll=0 omem=0 events=r cmd=client"
    const parsed: Record<string, string> = {};
    c.split(' ').forEach(part => {
      const [k, v] = part.split('=');
      if (k) parsed[k] = v;
    });
    console.log(`- ID: ${parsed.id}, Addr: ${parsed.addr}, Name: ${parsed.name || '(none)'}, Cmd: ${parsed.cmd}, Age: ${parsed.age}s, Idle: ${parsed.idle}s`);
  }

  redis.disconnect();
}

main().catch(console.error);
