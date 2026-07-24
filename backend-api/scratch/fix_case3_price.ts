import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating local DB for NGUYỄN QUỐC TRUNG (ID: 192759)...');

  // Update COMBO DA CHUYÊN SÂU + PHUN XĂM CHUYÊN SÂU (ServiceID: 369618)
  const serviceTab = await prisma.customerServiceTab.updateMany({
    where: {
      customer_id: 192759,
      service_id: 369618
    },
    data: {
      price: 90500000,
      total: 32500000,
      synced_at: new Date()
    }
  });

  console.log(`✅ Updated ${serviceTab.count} service tab records.`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
