import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const configs = await prisma.cronConfig.findMany();
  console.log('📋 Danh sách CronConfig trong Database:');
  console.table(configs);

  const sheetConfig = await prisma.cronConfig.findUnique({ where: { id: 'handleGoogleSheetPushCron' } });
  console.log('📌 Config cụ thể cho handleGoogleSheetPushCron:', sheetConfig);

  await prisma.$disconnect();
}

main().catch(console.error);
