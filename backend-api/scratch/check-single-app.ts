import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const app = await prisma.appointment.findFirst({
    where: {
      service_name: { contains: 'tư vấn', mode: 'insensitive' }
    }
  });
  console.log('Sample appointment with service_name containing "tư vấn":', app);
  
  // Count how many appointments have service_id = 0 in database
  const countZero = await prisma.appointment.count({
    where: { service_id: 0 }
  });
  console.log('Appointments with service_id = 0:', countZero);
  
  // Count how many appointments have service_id = null
  const countNull = await prisma.appointment.count({
    where: { service_id: null }
  });
  console.log('Appointments with service_id = null:', countNull);
  
  // Find distinct service_id and service_name pairs
  const distinctServices = await prisma.appointment.findMany({
    select: { service_id: true, service_name: true },
    distinct: ['service_id', 'service_name'],
    take: 20
  });
  console.log('Distinct service_id and service_name pairs in appointments:', distinctServices);
}

main().catch(console.error).finally(() => prisma.$disconnect());
