import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ids = [200287, 200326];
  for (const id of ids) {
    console.log(`\n=== Customer ${id} ===`);
    const c = await prisma.customer.findUnique({
      where: { id },
      include: {
        branch: true,
        appointments: true,
        payments: true,
        treatment_plans: true,
        prescriptions: true,
        treatments: true
      }
    });
    if (!c) {
      console.log(`Not found.`);
      continue;
    }
    console.log(`Name: ${c.name}`);
    console.log(`Phone: ${c.phone}`);
    console.log(`Branch: ${c.branch?.name} (ID: ${c.branch_id})`);
    console.log(`Appointments count: ${c.appointments.length}`);
    for (const app of c.appointments) {
      console.log(`  - Appointment ID: ${app.id}, Date: ${app.appointment_date?.toISOString()}, Branch: ${app.branch_id}, Status: ${app.status_name}`);
    }
    console.log(`Payments count: ${c.payments.length}`);
    console.log(`Treatment plans count: ${c.treatment_plans.length}`);
    console.log(`Prescriptions count: ${c.prescriptions.length}`);
    console.log(`Treatments count: ${c.treatments.length}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
