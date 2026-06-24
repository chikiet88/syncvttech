import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING SYNC PROGRESS & DATA UPDATES ===");

  const incompleteTasks = await prisma.syncTask.findMany({
    where: {
      status: {
        not: 'SUCCESS'
      }
    },
    orderBy: [
      { date: 'asc' },
      { branch_name: 'asc' },
      { type: 'asc' }
    ]
  });

  console.log(`\nTotal incomplete tasks: ${incompleteTasks.length}`);

  // Count by status
  const summary = await prisma.syncTask.groupBy({
    by: ['status'],
    _count: true
  });
  console.log("Summary by status:", summary);

  // Check database counts
  const totalCustomers = await prisma.customer.count();
  const totalAppointments = await prisma.appointment.count();
  console.log(`\nDatabase Counts:`);
  console.log(`- Total Customers: ${totalCustomers}`);
  console.log(`- Total Appointments: ${totalAppointments}`);

  // Check recent updates
  const now = new Date();
  const oneMinAgo = new Date(now.getTime() - 60 * 1000);
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const newCust1m = await prisma.customer.count({ where: { updated_at: { gte: oneMinAgo } } });
  const newCust5m = await prisma.customer.count({ where: { updated_at: { gte: fiveMinAgo } } });
  const newCust15m = await prisma.customer.count({ where: { updated_at: { gte: fifteenMinAgo } } });
  const newCust1h = await prisma.customer.count({ where: { updated_at: { gte: oneHourAgo } } });

  const newAppt1m = await prisma.appointment.count({ where: { updated_at: { gte: oneMinAgo } } });
  const newAppt5m = await prisma.appointment.count({ where: { updated_at: { gte: fiveMinAgo } } });
  const newAppt15m = await prisma.appointment.count({ where: { updated_at: { gte: fifteenMinAgo } } });
  const newAppt1h = await prisma.appointment.count({ where: { updated_at: { gte: oneHourAgo } } });

  console.log(`\nRecent Updates (Activity Indicator):`);
  console.log(`- Customers updated:`);
  console.log(`  * Last 1 minute: ${newCust1m}`);
  console.log(`  * Last 5 minutes: ${newCust5m}`);
  console.log(`  * Last 15 minutes: ${newCust15m}`);
  console.log(`  * Last 1 hour: ${newCust1h}`);
  console.log(`- Appointments updated:`);
  console.log(`  * Last 1 minute: ${newAppt1m}`);
  console.log(`  * Last 5 minutes: ${newAppt5m}`);
  console.log(`  * Last 15 minutes: ${newAppt15m}`);
  console.log(`  * Last 1 hour: ${newAppt1h}`);

  await prisma.$disconnect();
}

main().catch(console.error);
