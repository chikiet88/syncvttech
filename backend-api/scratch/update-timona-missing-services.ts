import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaService } from '../src/prisma.service';

async function main() {
  console.log('Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);

  console.log('1. Loading services and service groups into memory for fast lookup...');
  const [services, groups] = await Promise.all([
    prisma.service.findMany({ select: { id: true, name: true, group_id: true } }),
    prisma.serviceGroup.findMany({ select: { id: true, name: true } }),
  ]);
  
  const serviceMap = new Map(services.map(s => [s.id, s]));
  const groupMap = new Map(groups.map(g => [g.id, g.name]));
  
  // Cache to find first service under group_id
  const groupToServiceMap = new Map<number, number>();
  for (const s of services) {
    if (s.group_id && !groupToServiceMap.has(s.group_id)) {
      groupToServiceMap.set(s.group_id, s.id);
    }
  }

  const parseCommaId = (val: any): number => {
    if (!val) return 0;
    const match = String(val).match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  console.log('2. Fetching all Timona appointments with service_id = 0 since 2026-05-01...');
  const appointments = await prisma.appointment.findMany({
    where: {
      AND: [
        { appointment_date: { gte: new Date('2026-05-01') } },
        { branch_id: { in: [14, 15, 16, 17, 18, 22, 25] } },
        {
          OR: [
            { service_id: 0 },
            { service_id: null },
            { service_name: 'Tư Vấn' }
          ]
        },
        { customer_id: { not: null } }
      ]
    },
    select: {
      id: true,
      customer_id: true,
      vttech_code: true,
      customer_name: true
    }
  });

  console.log(`Found ${appointments.length} appointments with missing services.`);
  if (appointments.length === 0) {
    console.log('No appointments to update. Exiting.');
    await app.close();
    return;
  }

  const uniqueCustomerIds = Array.from(new Set(appointments.map(a => a.customer_id).filter(Boolean))) as number[];
  console.log(`Grouped into ${uniqueCustomerIds.length} unique customers.`);

  console.log('Logging in to VTTech API...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const appMapByCust = new Map<number, typeof appointments>();
  for (const app of appointments) {
    if (app.customer_id) {
      if (!appMapByCust.has(app.customer_id)) {
        appMapByCust.set(app.customer_id, []);
      }
      appMapByCust.get(app.customer_id)!.push(app);
    }
  }

  let totalUpdated = 0;
  console.log(`Starting update for ${uniqueCustomerIds.length} customers...`);

  const accounts = ['ittest1', 'ittest2', 'ittest123'];
  let accIdx = 0;

  for (let i = 0; i < uniqueCustomerIds.length; i++) {
    const custId = uniqueCustomerIds[i];
    const targetApps = appMapByCust.get(custId) || [];
    const username = accounts[accIdx % accounts.length];
    accIdx++;

    console.log(`[${i + 1}/${uniqueCustomerIds.length}] Customer ID: ${custId} (has ${targetApps.length} target apps)...`);

    try {
      const res = await vttechApi.callHandler(
        '/Customer/ScheduleList_Schedule/',
        'Loadata',
        {
          CustomerID: custId.toString(),
          TicketID: '0',
          Limit: '100',
          BeginID: '0',
          IsDelete: '0',
          IsTemp: '0',
        },
        username
      );

      const schedules = Array.isArray(res) ? res : (res?.Table || res?.data || []);
      
      for (const sched of schedules) {
        const schedId = parseInt(sched.ID || sched.ScheduleID);
        if (!schedId) continue;

        // Check if this schedule is in our list of targeted appointments
        const appRecord = targetApps.find(a => a.id === schedId);
        if (!appRecord) continue;

        const treatId = parseCommaId(sched.ServiceTreat_ID || sched.ServiceTreat);
        const careId = parseCommaId(sched.ServiceCare_ID || sched.ServiceCare);
        const rawServiceId = parseCommaId(sched.ServiceID || sched.Service);

        if (treatId === 0 && careId === 0 && rawServiceId === 0) {
          continue;
        }

        let resolvedServiceId = 0;
        let resolvedServiceName = '';

        if (treatId > 0) {
          resolvedServiceId = treatId;
          const s = serviceMap.get(treatId);
          resolvedServiceName = s?.name || sched.ServiceName || 'Điều trị';
        } else if (careId > 0) {
          const groupServiceId = groupToServiceMap.get(careId);
          if (groupServiceId) {
            resolvedServiceId = groupServiceId;
          } else {
            resolvedServiceId = careId;
          }
          const gName = groupMap.get(careId);
          resolvedServiceName = gName || sched.ServiceName || 'CSD cơ bản';
        } else if (rawServiceId > 0) {
          resolvedServiceId = rawServiceId;
          const s = serviceMap.get(rawServiceId);
          resolvedServiceName = s?.name || sched.ServiceName || '';
        }

        if (resolvedServiceId > 0) {
          await prisma.appointment.update({
            where: { id: schedId },
            data: {
              service_id: resolvedServiceId,
              service_name: resolvedServiceName,
              updated_at: new Date()
            }
          });
          totalUpdated++;
          console.log(`   ✅ [UPDATED] App ${schedId} (${appRecord.vttech_code} - ${appRecord.customer_name}): service_name = "${resolvedServiceName}"`);
        }
      }
    } catch (err: any) {
      console.error(`   ❌ Error fetching schedules for customer ${custId}: ${err.message}`);
    }

    // Small delay to prevent overload
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  console.log(`\n======================================================`);
  console.log(`🏁 Timona missing services update completed!`);
  console.log(`Total appointments updated: ${totalUpdated}`);
  console.log(`======================================================`);

  await app.close();
}

main().catch(console.error);
