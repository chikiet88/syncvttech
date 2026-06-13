import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const serviceZero = await prisma.service.findUnique({
    where: { id: 0 }
  });
  console.log('Service ID 0 in DB:', serviceZero);
  
  // Find appointments where service_id is NOT 0
  const appNotZero = await prisma.appointment.findFirst({
    where: {
      NOT: [
        { service_id: 0 },
        { service_id: null }
      ]
    }
  });
  console.log('Sample appointment with service_id NOT 0:', appNotZero);
  
  // Let's count how many appointments have service_id != 0
  const countNotZero = await prisma.appointment.count({
    where: {
      NOT: [
        { service_id: 0 },
        { service_id: null }
      ]
    }
  });
  console.log('Appointments count with service_id NOT 0:', countNotZero);
  
  // Let's count total appointments
  const totalApps = await prisma.appointment.count();
  console.log('Total appointments:', totalApps);
}

main().catch(console.error).finally(() => prisma.$disconnect());
