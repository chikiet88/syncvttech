import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TIMONA_BRANCH_IDS = [14, 15, 16, 17, 18, 21, 22, 25];

async function main() {
  const branches = await prisma.branch.findMany({
    where: { id: { in: TIMONA_BRANCH_IDS } },
  });
  const branchMap = new Map(branches.map(b => [b.id, b.name]));

  console.log('Status distribution for Timona branches OVERALL:');
  for (const bId of TIMONA_BRANCH_IDS) {
    const stats = await prisma.appointment.groupBy({
      by: ['status'],
      _count: { id: true },
      where: {
        branch_id: bId,
      },
    });

    console.log(`\nBranch: ${branchMap.get(bId) || `CN #${bId}`} (ID: ${bId})`);
    if (stats.length === 0) {
      console.log('  No appointments');
    }
    for (const s of stats) {
      console.log(`  - Status ${s.status}: ${s._count.id} appointments`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
