import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaService } from '../src/prisma.service';

async function main() {
  console.log('Bootstrapping NestJS context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);

  console.log('Logging in...');
  await vttechApi.login();
  await vttechApi.getXsrfToken();

  const customerId = 200052;
  const targetScheduleId = 776363;
  const username = 'ittest1'; // Sử dụng tài khoản ittest1 có đủ quyền

  console.log(`Calling ScheduleList_Schedule for customer ${customerId} using ${username}...`);
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
    username
  );

  const items = Array.isArray(res) ? res : (res?.Table || res?.data || []);
  console.log(`Found ${items.length} schedules.`);

  const item = items.find((x: any) => parseInt(x.ID) === targetScheduleId);
  if (!item) {
    console.error(`Could not find schedule ${targetScheduleId} in list!`);
    await app.close();
    return;
  }

  console.log('Found raw schedule:', JSON.stringify(item, null, 2));

  // Phân tích dịch vụ
  const parseCommaId = (val: any): number => {
    if (!val) return 0;
    const match = String(val).match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  const treatId = parseCommaId(item.ServiceTreat_ID || item.ServiceTreat);
  const careId = parseCommaId(item.ServiceCare_ID || item.ServiceCare);
  const rawServiceId = parseCommaId(item.ServiceID || item.Service);

  console.log(`Parsed IDs: treatId=${treatId}, careId=${careId}, rawServiceId=${rawServiceId}`);

  let resolvedServiceId = 0;
  let resolvedServiceName = '';

  if (treatId > 0) {
    resolvedServiceId = treatId;
    const s = await prisma.service.findUnique({ where: { id: treatId }, select: { name: true } });
    resolvedServiceName = s?.name || item.ServiceName || 'Điều trị';
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
    resolvedServiceName = g?.name || item.ServiceName || 'CSD cơ bản';
  } else if (rawServiceId > 0) {
    resolvedServiceId = rawServiceId;
    const s = await prisma.service.findUnique({ where: { id: rawServiceId }, select: { name: true } });
    resolvedServiceName = s?.name || item.ServiceName || '';
  } else {
    resolvedServiceId = 0;
    resolvedServiceName = item.ServiceName || item.TypeName || '';
  }

  console.log(`Resolved: service_id=${resolvedServiceId}, service_name=${resolvedServiceName}`);

  const updated = await prisma.appointment.update({
    where: { id: targetScheduleId },
    data: {
      service_id: resolvedServiceId,
      service_name: resolvedServiceName,
      updated_at: new Date()
    }
  });

  console.log('Successfully updated appointment in DB:', JSON.stringify(updated, null, 2));

  await app.close();
}

main().catch(console.error);
