import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:12003/db_tazagroup_vttech_sync"
    }
  }
});

async function main() {
  console.log('🔄 Checking existing cron configurations in DB...');
  const configs = await prisma.cronConfig.findMany();
  console.log('Current configurations:', JSON.stringify(configs, null, 2));

  console.log('\n🚀 Enabling handleHistoricalSyncCron...');
  const updated = await prisma.cronConfig.upsert({
    where: { id: 'handleHistoricalSyncCron' },
    update: { enabled: true },
    create: {
      id: 'handleHistoricalSyncCron',
      name: 'Đồng bộ hồi quy lịch sử (Backlog)',
      enabled: true,
      description: 'Mỗi 30 phút kiểm tra và giải quyết 1 phần dữ liệu cũ (Backlog)'
    }
  });

  console.log('Successfully enabled:', JSON.stringify(updated, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
