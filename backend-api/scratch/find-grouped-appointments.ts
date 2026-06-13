import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.appointment.count({
    where: {
      service_id: { gt: 0 },
      AND: [
        // Status filter
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
        // Type filter
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
      ]
    }
  });
  
  console.log('Matching appointments (service_id > 0) count:', count);
  
  if (count > 0) {
    const matchingApps = await prisma.appointment.findMany({
      where: {
        service_id: { gt: 0 },
        AND: [
          // Status filter
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
          // Type filter
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
        ]
      },
      take: 5
    });
    console.log('Samples:', matchingApps.map(a => ({
      id: a.id,
      service_id: a.service_id,
      service_name: a.service_name,
      status_name: a.status_name,
      status: a.status,
      type_name: a.type_name,
      note: a.note
    })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
