import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ids = [777248, 777679, 777535];
  for (const id of ids) {
    const a = await prisma.appointment.findUnique({
      where: { id }
    });
    if (a) {
      console.log(`Appointment ID: ${id}`);
      console.log(`  Customer: ${a.customer_name} (ID: ${a.customer_id})`);
      console.log(`  Branch: ${a.branch_name} (ID: ${a.branch_id})`);
      console.log(`  Created At: ${a.created_at.toISOString()}`);
      console.log(`  Updated At: ${a.updated_at.toISOString()}`);
    } else {
      console.log(`Appointment ID: ${id} NOT found.`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
