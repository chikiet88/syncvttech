
import { PrismaClient } from '@prisma/client';

async function checkProgress() {
  const prisma = new PrismaClient();
  try {
    const tasks = await prisma.syncTask.findMany({
      orderBy: { date: 'desc' },
      take: 20
    });

    console.log('--- Current Sync Tasks (Top 20 Recent) ---');
    console.table(tasks.map(t => ({
      date: t.date.toISOString().split('T')[0],
      branch: t.branch_name,
      status: t.status,
      details: `${t.completed_details}/${t.total_details}`,
      customers: t.customers_count,
      revenue: t.revenue_total.toLocaleString(),
      updated: t.updated_at.toLocaleTimeString()
    })));

    const summary = await prisma.syncTask.groupBy({
      by: ['status'],
      _count: {
        id: true
      },
      _sum: {
        total_details: true,
        completed_details: true
      }
    });

    console.log('\n--- Status Summary ---');
    summary.forEach(s => {
      console.log(`${s.status}: ${s._count.id} tasks, Details: ${s._sum.completed_details || 0}/${s._sum.total_details || 0}`);
    });

    const activeTasks = tasks.filter(t => t.status === 'PROCESSING');
    if (activeTasks.length > 0) {
        console.log('\n--- Active Tasks Detail ---');
        activeTasks.forEach(t => {
            const percent = t.total_details > 0 ? Math.round((t.completed_details / t.total_details) * 100) : 0;
            console.log(`- ${t.date.toISOString().split('T')[0]} [${t.branch_name}]: ${percent}% (${t.completed_details}/${t.total_details})`);
        });
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

checkProgress();
