import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.syncTask.findMany({
    where: { date: new Date('2026-06-16') }
  });
  console.log('All June 16 Tasks:');
  tasks.forEach(t => {
    console.log(`ID: ${t.id} | Branch: ${t.branch_name} (${t.branch_id}) | Status: ${t.status} | Progress: ${t.completed_details}/${t.total_details} | Apps: ${t.appointments_count} | Custs: ${t.customers_count} | Error: ${t.error_message}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
