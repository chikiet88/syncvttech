import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

async function main() {
  console.log('Bootstrapping NestJS context for DB fix...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('Fetching services and groups...');
  const [services, groups] = await Promise.all([
    prisma.service.findMany({ select: { id: true, name: true, group_id: true } }),
    prisma.serviceGroup.findMany({ select: { id: true, name: true } }),
  ]);

  const serviceMap = new Map(services.map(s => [s.id, s]));
  const groupMap = new Map(groups.map(g => [g.id, g.name]));
  const groupByName = new Map(groups.map(g => [g.name.toLowerCase().trim(), g]));

  console.log('Fetching active appointments with service_id > 0...');
  const appointments = await prisma.appointment.findMany({
    where: {
      service_id: { gt: 0 },
    },
    select: {
      id: true,
      vttech_code: true,
      service_id: true,
      service_name: true,
    }
  });

  console.log(`Found ${appointments.length} appointments with service_id. Scanning for clashes...`);

  let fixCount = 0;
  const toUpdate: number[] = [];

  for (const a of appointments) {
    if (!a.service_id || !a.service_name) continue;

    const service = serviceMap.get(a.service_id);
    if (!service) continue;

    const dbGroupName = service.group_id ? groupMap.get(service.group_id) : null;
    const currentServiceNameLower = a.service_name.toLowerCase().trim();

    // Check if the service name stored is actually a group name
    const hasGroupWithName = groupByName.has(currentServiceNameLower);

    // If the service's group name is different from the stored service_name AND
    // the stored service_name matches an actual group name, this is a clash!
    if (dbGroupName && dbGroupName.toLowerCase().trim() !== currentServiceNameLower && hasGroupWithName) {
      toUpdate.push(a.id);
      if (fixCount < 5) {
        console.log(`Clash detected: ID=${a.id}, Code=${a.vttech_code}, service_id=${a.service_id}, service_name="${a.service_name}" (Resolves to service "${service.name}" under group "${dbGroupName}")`);
      }
      fixCount++;
    }
  }

  console.log(`\nFound total ${fixCount} clashing appointments.`);

  if (toUpdate.length > 0) {
    console.log('Updating database appointments...');
    const result = await prisma.appointment.updateMany({
      where: {
        id: { in: toUpdate },
      },
      data: {
        service_id: 0,
      },
    });
    console.log(`Successfully updated ${result.count} appointments to service_id = 0.`);
  } else {
    console.log('No appointments need fixing.');
  }

  await app.close();
  console.log('Done.');
}

main().catch(console.error);
