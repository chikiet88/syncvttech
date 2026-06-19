import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaService } from '../src/prisma.service';
import { SyncService } from '../src/sync.service';

async function main() {
  console.log('Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);
  const syncService = app.get(SyncService);

  console.log('1. Stopping and resetting active queues...');
  try {
    await syncService.resetQueue();
  } catch (err: any) {}

  console.log('2. Loading services and service groups into memory for fast lookup...');
  const [services, groups] = await Promise.all([
    prisma.service.findMany({ select: { id: true, name: true, group_id: true } }),
    prisma.serviceGroup.findMany({ select: { id: true, name: true } }),
  ]);
  
  const serviceMap = new Map(services.map(s => [s.id, s]));
  const groupMap = new Map(groups.map(g => [g.id, g.name]));
  
  // Cache để tìm nhanh service đầu tiên thuộc group_id
  const groupToServiceMap = new Map<number, number>();
  for (const s of services) {
    if (s.group_id && !groupToServiceMap.has(s.group_id)) {
      groupToServiceMap.set(s.group_id, s.id);
    }
  }

  console.log(`Loaded ${services.length} services and ${groups.length} groups to memory cache.`);

  console.log('Logging in to VTTech API...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const branchIds = [1, 2, 3, 4, 6, 14, 15, 16, 17, 18, 22, 23, 25, 26];
  const startDate = new Date('2026-06-01');
  const endDate = new Date();
  
  const days: string[] = [];
  const curr = new Date(startDate);
  while (curr <= endDate) {
    days.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  console.log(`Starting optimized fast update for ${days.length} days...`);

  const parseCommaId = (val: any): number => {
    if (!val) return 0;
    const match = String(val).match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  let totalUpdated = 0;
  let totalProcessed = 0;
  let totalErrors = 0;

  const accounts = ['ittest1', 'ittest2'];
  let accountIdx = 0;

  for (let d = 0; d < days.length; d++) {
    const dateStr = days[d];
    console.log(`\n📅 Processing Date: ${dateStr} (${d + 1}/${days.length})`);

    for (const branchId of branchIds) {
      const username = accounts[accountIdx % accounts.length];
      accountIdx++;

      let success = false;
      let retries = 2;

      while (!success && retries > 0) {
        try {
          const res = await vttechApi.callHandler(
            '/Desk/Appointment/AppointmentInDay_Desk_Branch/',
            'LoadataAppointmentList',
            {
              DateFrom: dateStr,
              BranchID: branchId.toString(),
              AppID: '0',
              StatusID: '0',
              DoctorID: '0',
              TypeApp: '1',
            },
            username
          );

          const items = Array.isArray(res) ? res : (res?.Table || res?.data || []);
          
          for (const item of items) {
            const sId = parseInt(item.ID || item.ScheduleID);
            if (!sId) continue;

            totalProcessed++;

            // Kiểm tra DB qua memory cache thì không thể, bắt buộc phải check trong Postgres
            // Nhưng check findUnique là SELECT đơn giản theo Khóa Chính (Primary Key) nên rất nhanh (< 1ms)
            const dbApp = await prisma.appointment.findUnique({
              where: { id: sId },
              select: { id: true, service_id: true }
            });

            if (dbApp && dbApp.service_id && dbApp.service_id > 0) {
              continue;
            }

            const treatId = parseCommaId(item.ServiceTreat_ID || item.ServiceTreat);
            const careId = parseCommaId(item.ServiceCare_ID || item.ServiceCare);
            const rawServiceId = parseCommaId(item.ServiceID || item.Service);

            if (treatId === 0 && careId === 0 && rawServiceId === 0) {
              continue;
            }

            // Resolve service sử dụng memory cache
            let resolvedServiceId = 0;
            let resolvedServiceName = '';

            if (treatId > 0) {
              resolvedServiceId = treatId;
              const s = serviceMap.get(treatId);
              resolvedServiceName = s?.name || item.ServiceName || 'Điều trị';
            } else if (careId > 0) {
              const groupServiceId = groupToServiceMap.get(careId);
              if (groupServiceId) {
                resolvedServiceId = groupServiceId;
              } else {
                resolvedServiceId = careId;
              }
              const gName = groupMap.get(careId);
              resolvedServiceName = gName || item.ServiceName || 'CSD cơ bản';
            } else if (rawServiceId > 0) {
              resolvedServiceId = rawServiceId;
              const s = serviceMap.get(rawServiceId);
              resolvedServiceName = s?.name || item.ServiceName || '';
            }

            if (resolvedServiceId > 0) {
              try {
                await prisma.appointment.update({
                  where: { id: sId },
                  data: {
                    service_id: resolvedServiceId,
                    service_name: resolvedServiceName,
                    updated_at: new Date()
                  }
                });
                totalUpdated++;
                console.log(`   [UPDATED] App ${sId} (${item.CustName}): service_name = "${resolvedServiceName}"`);
              } catch (dbErr: any) {
                console.log(`   ⚠️ DB Skip: App ${sId} (${item.CustName}) not found.`);
              }
            }
          }

          success = true;
        } catch (e: any) {
          retries--;
          console.error(`   ❌ Error on branch ${branchId} at ${dateStr} (Retries left: ${retries}): ${e.message}`);
          
          if (retries > 0) {
            if (e.message.includes('closed') || e.message.includes('Connection') || e.message.includes('Token')) {
              await vttechApi.login().catch(() => {});
              await vttechApi.getXsrfToken().catch(() => {});
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            totalErrors++;
          }
        }
      }

      // Delay nhỏ
      await new Promise(resolve => setTimeout(resolve, 80));
    }
  }

  console.log(`\n======================================================`);
  console.log(`🏁 Fast update finished!`);
  console.log(`Total processed appointments checked: ${totalProcessed}`);
  console.log(`Total service records updated in DB: ${totalUpdated}`);
  console.log(`Total branch/day failures: ${totalErrors}`);
  console.log(`======================================================`);

  await app.close();
}

main().catch(console.error);
