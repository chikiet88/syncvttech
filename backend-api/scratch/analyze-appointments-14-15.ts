import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  const appointments = await prisma.appointment.findMany({
    where: {
      appointment_date: {
        gte: new Date('2026-06-14T00:00:00.000Z'),
        lte: new Date('2026-06-15T23:59:59.999Z'),
      },
      branch: {
        name: { contains: 'Timona', mode: 'insensitive' },
      },
    },
    include: {
      branch: true,
    },
  });

  console.log(`Total Timona appointments in DB for 14+15 June: ${appointments.length}`);

  // We want to see how many match the Type and Status filters
  let countTypeTuVan = 0;
  let countStatusRaVe = 0;
  let countBoth = 0;

  const typeDetails: any[] = [];
  const statusDetails: any[] = [];

  for (const a of appointments) {
    const typeMatch = (a.type_name?.toLowerCase().includes('tư vấn') || 
                      (!a.type_name && a.service_name?.toLowerCase().includes('tư vấn')));
    const statusMatch = (a.status_name?.toLowerCase().includes('ra về') || 
                        (!a.status_name && (a.status === 2 || a.status === 4)));

    if (typeMatch) countTypeTuVan++;
    if (statusMatch) countStatusRaVe++;
    if (typeMatch && statusMatch) countBoth++;

    console.log(`ID: ${a.id} | Name: ${a.customer_name} | Branch: ${a.branch?.name} | Date: ${a.appointment_date?.toISOString().split('T')[0] || 'N/A'} | Type: "${a.type_name}" (Service: "${a.service_name}") -> MatchType: ${typeMatch} | Status: "${a.status_name}" (Code: ${a.status}) -> MatchStatus: ${statusMatch}`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Type "Tư vấn" matches: ${countTypeTuVan}`);
  console.log(`Status "Ra về" matches: ${countStatusRaVe}`);
  console.log(`Both match (Exported to Google Sheets): ${countBoth}`);

  await app.close();
}

main().catch(console.error);
