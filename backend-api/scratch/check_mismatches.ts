import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING FOR APPOINTMENT BRANCH MISMATCHES ===');

  const appointments = await prisma.appointment.findMany({
    include: {
      branch: true
    }
  });

  let mismatchCount = 0;
  for (const a of appointments) {
    const dbBranchName = a.branch?.name || '';
    const apptBranchName = a.branch_name || '';
    
    if (apptBranchName && dbBranchName && apptBranchName.trim().toLowerCase() !== dbBranchName.trim().toLowerCase()) {
      mismatchCount++;
      if (mismatchCount <= 30) {
        console.log(`[MISMATCH] Appt ID: ${a.id} | Date: ${a.appointment_date?.toISOString().split('T')[0]}`);
        console.log(`  Customer: ${a.customer_name} (${a.phone})`);
        console.log(`  Appt Branch Name (API): "${apptBranchName}"`);
        console.log(`  DB Branch ID: ${a.branch_id} ("${dbBranchName}")`);
      }
    }
  }

  console.log(`\nTotal mismatches found: ${mismatchCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
