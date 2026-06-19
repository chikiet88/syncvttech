import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targets = ['385040149', '908600322', '0385040149', '0908600322'];
  
  for (const target of targets) {
    console.log(`\n=== Searching for: ${target} ===`);
    
    // Check in Customer
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { phone: { contains: target } },
          { code: { contains: target } },
          { name: { contains: target } },
          { id: isNaN(Number(target)) ? undefined : Number(target) }
        ].filter(Boolean) as any
      },
      include: { branch: true }
    });
    console.log(`Customers found:`, customers.length);
    for (const c of customers) {
      console.log(`- Customer ID: ${c.id}, Code: ${c.code}, Name: ${c.name}, Phone: ${c.phone}, Branch: ${c.branch?.name} (ID: ${c.branch_id})`);
    }

    // Check in Appointment
    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { phone: { contains: target } },
          { customer_name: { contains: target } },
          { id: isNaN(Number(target)) ? undefined : Number(target) },
          { customer_id: isNaN(Number(target)) ? undefined : Number(target) }
        ].filter(Boolean) as any
      },
      include: { branch: true }
    });
    console.log(`Appointments found:`, appointments.length);
    for (const a of appointments) {
      console.log(`- Appointment ID: ${a.id}, CustID: ${a.customer_id}, Name: ${a.customer_name}, Phone: ${a.phone}, Branch: ${a.branch?.name} (ID: ${a.branch_id}), Date: ${a.appointment_date?.toISOString()}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
