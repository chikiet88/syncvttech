
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkYears() {
  console.log('--- 📅 THỐNG KÊ ĐỒNG BỘ THEO NĂM ---');
  
  const yearStats = await prisma.$queryRaw`
    SELECT 
      EXTRACT(YEAR FROM date) as year,
      status,
      COUNT(*) as count
    FROM sync_tasks
    GROUP BY year, status
    ORDER BY year DESC, status;
  `;
  
  console.table(yearStats);

  await prisma.$disconnect();
}

checkYears();
