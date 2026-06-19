import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== SEARCHING FOR HONG SAM ===');
  
  const customer = await prisma.customer.findFirst({
    where: {
      name: {
        contains: 'HỒNG SÂM',
        mode: 'insensitive'
      }
    },
    include: {
      branch: true
    }
  });

  if (customer) {
    console.log(`FOUND CUSTOMER:`);
    console.log(`ID: ${customer.id}`);
    console.log(`Code: ${customer.code}`);
    console.log(`Name: ${customer.name}`);
    console.log(`Phone: ${customer.phone}`);
    console.log(`Branch: ${customer.branch?.name} (ID: ${customer.branch_id})`);
  } else {
    console.log('Customer NOT found.');
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      customer_name: {
        contains: 'HỒNG SÂM',
        mode: 'insensitive'
      }
    },
    include: {
      branch: true
    }
  });

  if (appointment) {
    console.log(`FOUND APPOINTMENT:`);
    console.log(`ID: ${appointment.id}`);
    console.log(`Customer: ${appointment.customer_name}`);
    console.log(`Phone: ${appointment.phone}`);
    console.log(`Branch: ${appointment.branch?.name} (ID: ${appointment.branch_id})`);
    console.log(`Date: ${appointment.appointment_date?.toISOString()}`);
    console.log(`Status: ${appointment.status_name}`);
  } else {
    console.log('Appointment NOT found.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
