import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const branchId = 22;
  const targetDateStr = '2026-06-16';
  const start = new Date(`${targetDateStr}T00:00:00.000Z`);
  const end = new Date(`${targetDateStr}T23:59:59.999Z`);

  console.log(`=== Appointments for Branch ${branchId} on ${targetDateStr} ===`);
  const appointments = await prisma.appointment.findMany({
    where: {
      branch_id: branchId,
      appointment_date: {
        gte: start,
        lte: end
      }
    },
    include: {
      customer: true
    }
  });

  for (const app of appointments) {
    console.log(`ID: ${app.id}, Customer ID: ${app.customer_id}, Name: ${app.customer_name}, Phone: ${app.phone}, Date: ${app.appointment_date?.toISOString()}, Status: ${app.status_name}`);
    if (app.customer) {
      console.log(`  -> Customer in DB: Name: ${app.customer.name}, Phone: ${app.customer.phone}, Branch ID: ${app.customer.branch_id}`);
    } else {
      console.log(`  -> Customer NOT linked (null)`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
