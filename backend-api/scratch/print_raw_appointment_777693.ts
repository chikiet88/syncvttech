import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const appt = await prisma.appointment.findUnique({
    where: { id: 777693 }
  });
  console.log("Appointment 777693:", JSON.stringify(appt, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
