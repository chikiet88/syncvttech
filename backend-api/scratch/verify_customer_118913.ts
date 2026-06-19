import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findUnique({
    where: { id: 118913 },
    include: { branch: true }
  });

  if (customer) {
    console.log(`CUSTOMER 118913 FOUND!`);
    console.log(`Name: ${customer.name}`);
    console.log(`Phone: ${customer.phone}`);
    console.log(`Branch: ${customer.branch?.name} (ID: ${customer.branch_id})`);
  } else {
    console.log('Customer 118913 NOT found yet.');
  }

  const appt = await prisma.appointment.findFirst({
    where: { customer_id: 118913 },
    include: { branch: true }
  });

  if (appt) {
    console.log(`APPOINTMENT FOUND!`);
    console.log(`ID: ${appt.id}`);
    console.log(`Branch: ${appt.branch?.name} (ID: ${appt.branch_id})`);
    console.log(`Date: ${appt.appointment_date?.toISOString()}`);
    console.log(`Status: ${appt.status_name}`);
  } else {
    console.log('Appointment for customer 118913 NOT found yet.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
