import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== VERIFYING SYNCHRONIZED DATA ===');

  const searchPhones = ['385040149', '0385040149', '908600322', '0908600322', '982251996', '0982251996'];

  console.log('\n--- 1. Customers in DB ---');
  const customers = await prisma.customer.findMany({
    where: {
      OR: searchPhones.map(phone => ({
        phone: { contains: phone }
      }))
    },
    include: {
      branch: true
    }
  });

  customers.forEach(c => {
    console.log(`Customer ID: ${c.id} | Code: ${c.code} | Name: ${c.name} | Phone: ${c.phone} | Branch: ${c.branch?.name} (ID: ${c.branch_id})`);
  });

  console.log('\n--- 2. Appointments in DB ---');
  const appointments = await prisma.appointment.findMany({
    where: {
      OR: searchPhones.map(phone => ({
        phone: { contains: phone }
      }))
    },
    include: {
      branch: true
    }
  });

  appointments.forEach(a => {
    console.log(`Appt ID: ${a.id} | Name: ${a.customer_name} | Phone: ${a.phone} | Branch: ${a.branch?.name} (ID: ${a.branch_id}) | Date: ${a.appointment_date?.toISOString()} | Status: ${a.status_name}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
