import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching database services and service groups...');
  const [services, groups] = await Promise.all([
    prisma.service.findMany({ select: { id: true, name: true, group_id: true } }),
    prisma.serviceGroup.findMany({ select: { id: true, name: true } }),
  ]);

  const serviceMap = new Map(services.map(s => [s.id, s]));
  const groupMap = new Map(groups.map(g => [g.id, g.name]));

  console.log(`Loaded ${services.length} services and ${groups.length} groups.`);

  // Find services that have a group
  const servicesWithGroup = services.filter(s => s.group_id !== null);
  const serviceIds = servicesWithGroup.map(s => s.id);
  console.log(`Found ${servicesWithGroup.length} service definitions in DB that belong to a group.`);

  // Let's query appointments that have one of these service IDs and match our filters
  console.log('Querying appointments in DB matching the filters and having a grouped service...');
  const where: any = {
    AND: [
      { service_id: { in: serviceIds } },
      // Status "Ra Về" filter
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
      // Type "Tư vấn" filter
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
  };

  const appointments = await prisma.appointment.findMany({
    where,
    take: 10,
    orderBy: { appointment_date: 'desc' }
  });

  console.log(`Found ${appointments.length} matching appointments.`);

  if (appointments.length > 0) {
    const creatorIds = [...new Set(appointments.map(a => a.created_by_id).filter(Boolean))] as number[];
    const employeeMap = new Map<number, string>();
    if (creatorIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, full_name: true },
      });
      users.forEach(u => {
        if (u.full_name) employeeMap.set(u.id, u.full_name);
      });

      const missingIds = creatorIds.filter(id => !employeeMap.has(id));
      if (missingIds.length > 0) {
        const employees = await prisma.employee.findMany({
          where: { id: { in: missingIds } },
          select: { id: true, name: true },
        });
        employees.forEach(e => {
          if (e.name) employeeMap.set(e.id, e.name);
        });
      }
    }

    appointments.forEach(a => {
      // Creator Name formatting (no space between name and hours)
      const creatorName = a.created_by_id ? (employeeMap.get(a.created_by_id) || '') : '';
      let saleTimeDate = creatorName;
      const createdDate = a.vttech_created_at || a.appointment_date;
      if (createdDate) {
        const hh = String(createdDate.getHours()).padStart(2, '0');
        const mm = String(createdDate.getMinutes()).padStart(2, '0');
        const dd = String(createdDate.getDate()).padStart(2, '0');
        const mMonth = String(createdDate.getMonth() + 1).padStart(2, '0');
        const yyyy = createdDate.getFullYear();
        saleTimeDate = `${creatorName}${hh}:${mm} ${dd}-${mMonth}-${yyyy}`;
      }

      // Funnel note formatting
      const service = a.service_id ? serviceMap.get(a.service_id) : null;
      const funnelName = service?.group_id ? groupMap.get(service.group_id) : '';
      const noteWithFunnel = funnelName ? `[${funnelName}] ${a.note || ''}`.trim() : (a.note || '');

      console.log('-------------------------------------------');
      console.log(`Mã LH: ${a.vttech_code}`);
      console.log(`Dịch vụ: ${a.service_name} (ID: ${a.service_id})`);
      console.log(`Tên Phễu: ${funnelName || 'N/A'}`);
      console.log(`Nội dung (Note): ${noteWithFunnel}`);
      console.log(`Trạng thái: ${a.status_name} (Code: ${a.status})`);
      console.log(`Loại: ${a.type_name}`);
      console.log(`Người tạo & Ngày giờ: ${saleTimeDate}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
