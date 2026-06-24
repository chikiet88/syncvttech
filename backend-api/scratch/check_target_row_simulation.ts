import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== SIMULATING GOOGLE SHEET EXPORT FOR TAZA ===");

  const dateFrom = new Date('2026-01-01T00:00:00.000Z');
  // Include the whole day of 2026-06-24
  const dateTo = new Date('2026-06-24T23:59:59.999Z');

  // Exact same where query as in excel-export.service.ts
  const whereAndConditions: any[] = [
    {
      appointment_date: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
    {
      branch: {
        name: { contains: 'Taza', mode: 'insensitive' },
      },
    },
    {
      OR: [
        { status_name: { contains: 'Ra Về', mode: 'insensitive' } },
        {
          AND: [
            { OR: [{ status_name: null }, { status_name: '' }] },
            { OR: [{ status: 2 }, { status: 4 }] }
          ]
        }
      ]
    },
    {
      OR: [
        { type_name: { contains: 'tư vấn', mode: 'insensitive' } },
        {
          AND: [
            { OR: [{ type_name: null }, { type_name: '' }] },
            { service_name: { contains: 'tư vấn', mode: 'insensitive' } }
          ]
        }
      ]
    }
  ];

  const appointments = await prisma.appointment.findMany({
    where: {
      AND: whereAndConditions
    },
    orderBy: {
      appointment_date: 'asc'
    }
  });

  console.log(`Total Taza sheet rows fetched: ${appointments.length}`);

  // Find TRẦN BẠCH THẢO NGUYÊN
  const targetPhone = '0329543815';
  const targetCode = 'C_T20260618.778444';

  const matches = appointments.filter(a => a.phone?.includes(targetPhone) || a.vttech_code === targetCode);
  console.log(`\nFound ${matches.length} matching appointments in query:`);
  
  matches.forEach(m => {
    // Row index is 0-based in appointments array
    // Row 1 is header, so row in Sheet is index + 2
    const idx = appointments.findIndex(a => a.id === m.id);
    const rowNum = idx + 2;
    console.log(`- Mã lịch hẹn: ${m.vttech_code} | Name: ${m.customer_name} | Phone: ${m.phone} | Date: ${m.appointment_date?.toISOString()} | Branch: ${m.branch_name} | Status: ${m.status_name} | Simulated Row: ${rowNum}`);
  });

  // Let's print a small summary of dates of appointments in the list to check distribution
  console.log("\nSome sample rows around the target:");
  const firstMatch = appointments.findIndex(a => a.vttech_code === targetCode);
  if (firstMatch !== -1) {
    const startIdx = Math.max(0, firstMatch - 5);
    const endIdx = Math.min(appointments.length - 1, firstMatch + 5);
    for (let i = startIdx; i <= endIdx; i++) {
      const a = appointments[i];
      console.log(`Row ${i + 2}: ID: ${a.id} | Code: ${a.vttech_code} | Date: ${a.appointment_date?.toISOString()} | Name: ${a.customer_name}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
