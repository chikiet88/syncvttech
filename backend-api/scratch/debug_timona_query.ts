import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const startDate = new Date('2026-01-01T00:00:00.000Z');
  const endDate = new Date('2026-12-31T23:59:59.999Z');

  console.log(`Checking Timona appointments between ${startDate.toISOString()} and ${endDate.toISOString()}...`);

  // Query 1: Filter by branch name contains 'Timona'
  const count1 = await prisma.appointment.count({
    where: {
      appointment_date: { gte: startDate, lte: endDate },
      branch: { name: { contains: 'Timona', mode: 'insensitive' } }
    }
  });
  console.log(`Query 1 (branch.name contains Timona): ${count1}`);

  // Query 2: Filter by branch_id in Timona branch IDs
  const timonaBranches = await prisma.branch.findMany({
    where: { name: { contains: 'Timona', mode: 'insensitive' } },
    select: { id: true, name: true }
  });
  console.log('Timona branches found:', timonaBranches);

  const count2 = await prisma.appointment.count({
    where: {
      appointment_date: { gte: startDate, lte: endDate },
      branch_id: { in: timonaBranches.map(b => b.id) }
    }
  });
  console.log(`Query 2 (branch_id in Timona branch IDs): ${count2}`);

  // Inspect first 3 appointments
  const sample = await prisma.appointment.findMany({
    where: {
      appointment_date: { gte: startDate, lte: endDate },
      branch_id: { in: timonaBranches.map(b => b.id) }
    },
    take: 3,
    include: { branch: true }
  });
  console.log('Sample Timona appointments:', sample);

  await prisma.$disconnect();
}

main().catch(console.error);
