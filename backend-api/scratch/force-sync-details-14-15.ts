import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { VttechApiService } from '../src/vttech-api.service';
import { ExcelExportService } from '../src/excel-export.service';

async function main() {
  console.log('Bootstrapping NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const vttechApi = app.get(VttechApiService);
  const exportService = app.get(ExcelExportService);

  console.log('Logging in to VTTech...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();

  // Helper to parse dates and normalize to local noon to avoid TZ shift issues
  const parseDateToLocalNoon = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return null;
    d.setHours(12, 0, 0, 0);
    return d;
  };

  // Find all appointments on June 14 and 15, 2026 originally in DB
  const appointments = await prisma.appointment.findMany({
    where: {
      appointment_date: {
        gte: new Date('2026-06-13T17:00:00.000Z'), // Covers 14 June local time
        lte: new Date('2026-06-15T16:59:59.999Z'), // Covers 15 June local time
      },
      branch: {
        name: { contains: 'Timona', mode: 'insensitive' },
      },
    },
  });

  const uniqueCustomerIds = [...new Set(appointments.map(a => a.customer_id).filter(Boolean))] as number[];
  console.log(`Found ${appointments.length} appointments for ${uniqueCustomerIds.length} unique customers.`);

  // Function to parse comma ID
  const parseCommaId = (val: any): number => {
    if (!val) return 0;
    const match = String(val).match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  // Function to resolve appointment service
  const resolveAppointmentService = async (treatId: number, careId: number, rawServiceId: number, typeName: string | null, serviceName: string | null) => {
    let resolvedServiceId = 0;
    let resolvedServiceName = '';

    if (treatId > 0) {
      resolvedServiceId = treatId;
      const s = await prisma.service.findUnique({ where: { id: treatId }, select: { name: true } });
      resolvedServiceName = s?.name || serviceName || 'Điều trị';
    } else if (careId > 0) {
      const groupService = await prisma.service.findFirst({
        where: { group_id: careId },
        select: { id: true }
      });
      if (groupService) {
        resolvedServiceId = groupService.id;
      } else {
        resolvedServiceId = careId;
      }
      const g = await prisma.serviceGroup.findUnique({ where: { id: careId }, select: { name: true } });
      resolvedServiceName = g?.name || serviceName || 'CSD cơ bản';
    } else if (rawServiceId > 0) {
      resolvedServiceId = rawServiceId;
      const s = await prisma.service.findUnique({ where: { id: rawServiceId }, select: { name: true } });
      resolvedServiceName = s?.name || serviceName || '';
    } else {
      resolvedServiceId = 0;
      resolvedServiceName = serviceName || typeName || '';
    }
    return { service_id: resolvedServiceId, service_name: resolvedServiceName };
  };

  // Run detail sync for each customer
  for (const customerId of uniqueCustomerIds) {
    console.log(`\nSyncing schedules for customer ${customerId}...`);
    try {
      const res = await vttechApi.callHandler(
        '/Customer/ScheduleList_Schedule/',
        'Loadata',
        {
          CustomerID: customerId,
          TicketID: 0,
          Limit: 100,
          BeginID: 0,
          BeginDate: 0,
          IsDelete: 0,
          IsCancel: 1,
          IsTemp: 0
        },
        'ittest1' // Explicitly use ittest1 which has full permissions
      );

      const items = Array.isArray(res) ? res : (res?.Table || res?.data || []);
      console.log(`  - Found ${items.length} schedules on CRM.`);

      for (const item of items) {
        const sId = parseInt(item.ID);
        if (!sId) continue;

        const normalizedDate = parseDateToLocalNoon(item.Date_From);
        if (!normalizedDate) continue;

        const dateStr = normalizedDate.toISOString().split('T')[0];
        if (dateStr !== '2026-06-14' && dateStr !== '2026-06-15') {
          continue;
        }

        const treatId = parseCommaId(item.ServiceTreat_ID || item.ServiceTreat);
        const careId = parseCommaId(item.ServiceCare_ID || item.ServiceCare);
        const rawServiceId = parseCommaId(item.ServiceID || item.Service);
        const resolved = await resolveAppointmentService(
          treatId,
          careId,
          rawServiceId,
          item.TypeName || null,
          item.ServiceName || null
        );

        const status = (parseInt(item.IsCancel) > 0)
          ? 3
          : (String(item.StatusName || '').trim() === 'Ra Về' || String(item.StatusName || '').trim() === 'Đã Đến' || String(item.StatusName || '').trim() === 'Đang Điều Trị')
            ? 2
            : 1;

        console.log(`  -> Upserting AppID: ${sId} | Date: ${dateStr} | StatusName: ${item.StatusName} (Code: ${status}) | Type: ${item.TypeName}`);

        await prisma.appointment.upsert({
          where: { id: sId },
          update: {
            vttech_code: item.Code || null,
            customer_id: customerId,
            appointment_date: normalizedDate,
            note: item.Content || '',
            status,
            branch_id: parseInt(item.BranchID) || null,
            branch_name: item.Branch || '',
            employee_name: item.DoctorName || '',
            vttech_created_at: parseDateToLocalNoon(item.CreatedDate || item.Created),
            status_name: item.StatusName || null,
            type_name: item.TypeName || null,
            service_id: resolved.service_id,
            service_name: resolved.service_name,
          },
          create: {
            id: sId,
            vttech_code: item.Code || null,
            customer_id: customerId,
            appointment_date: normalizedDate,
            note: item.Content || '',
            status,
            branch_id: parseInt(item.BranchID) || null,
            branch_name: item.Branch || '',
            employee_name: item.DoctorName || '',
            vttech_created_at: parseDateToLocalNoon(item.CreatedDate || item.Created),
            status_name: item.StatusName || null,
            type_name: item.TypeName || null,
            service_id: resolved.service_id,
            service_name: resolved.service_name,
          }
        });
      }
    } catch (e: any) {
      console.error(`  - Failed to sync customer ${customerId}: ${e.message}`);
    }
  }

  // After updating DB, push to Google Sheets
  console.log('\nSync completed! Now pushing to Google Sheets...');
  const today = new Date().toISOString().split('T')[0];
  const result = await exportService.pushToGoogleSheet('2026-01-01', today);
  console.log(`Google Sheets updated successfully! URL: ${result.url}`);
  console.log(`Taza Rows: ${result.tazaCount}, Timona Rows: ${result.timonaCount}`);

  await app.close();
}

main().catch(console.error);
