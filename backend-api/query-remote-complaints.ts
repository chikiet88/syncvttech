import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:12003/db_tazagroup_vttech_sync"
    }
  }
});

async function run() {
  console.log('--- 📡 QUERYING REMOTE COMPLAINTS ---');
  try {
    const complaints = await prisma.customerComplaint.findMany({
      take: 2,
      orderBy: { id: 'desc' },
      include: {
        customer: {
          select: {
            name: true,
            branch_id: true
          }
        }
      }
    });
    console.log(JSON.stringify(complaints, null, 2));
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

run();
