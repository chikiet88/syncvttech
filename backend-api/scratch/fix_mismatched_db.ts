import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== STARTING RE-MAPPING OF MISMATCHED APPOINTMENTS ===');

  // 1. Load all branches
  const branches = await prisma.branch.findMany();
  const branchMap = new Map<string, number>();
  branches.forEach(b => {
    branchMap.set(b.name.trim().toLowerCase(), b.id);
  });

  console.log(`Loaded ${branches.length} branches.`);

  // 2. Load all appointments
  const appointments = await prisma.appointment.findMany({
    select: {
      id: true,
      branch_id: true,
      branch_name: true,
      customer_name: true
    }
  });

  console.log(`Loaded ${appointments.length} appointments from DB.`);

  let fixCount = 0;
  const updates: { id: number, correctBranchId: number }[] = [];

  for (const a of appointments) {
    const apptBranchName = a.branch_name ? a.branch_name.trim().toLowerCase() : '';
    if (!apptBranchName) continue;

    const correctBranchId = branchMap.get(apptBranchName);
    if (correctBranchId !== undefined && correctBranchId !== a.branch_id) {
      updates.push({ id: a.id, correctBranchId });
    }
  }

  console.log(`Found ${updates.length} appointments to fix.`);

  if (updates.length > 0) {
    console.log('Updating database in batches of 500...');
    const batchSize = 500;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      // Perform batch update using transaction
      await prisma.$transaction(
        batch.map(u => 
          prisma.appointment.update({
            where: { id: u.id },
            data: { branch_id: u.correctBranchId }
          })
        )
      );
      
      console.log(`Updated ${i + batch.length}/${updates.length}...`);
    }
    console.log('Update completed successfully!');
  } else {
    console.log('No mismatched appointments to update.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
