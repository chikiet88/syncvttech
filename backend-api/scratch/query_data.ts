import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== SEARCHING FOR SPECIFIC APPOINTMENTS / CUSTOMERS ===');

  // Phone numbers we are searching for:
  // 1. 385040149 (Timona)
  // 2. 908600322 (Timona)
  // 3. 982251996 (Taza - NGUYỄN THỊ HỒNG SÂM)
  
  const searchPhones = ['385040149', '0385040149', '908600322', '0908600322', '982251996', '0982251996'];

  console.log('\n--- 1. Searching in Customer table ---');
  const customers = await prisma.customer.findMany({
    where: {
      OR: searchPhones.map(phone => ({
        phone: { contains: phone }
      }))
    },
    include: {
      branch: true
    }
  });

  if (customers.length === 0) {
    console.log('No customers found with these phone numbers.');
  } else {
    customers.forEach(c => {
      console.log(`Customer ID: ${c.id}`);
      console.log(`  Code: ${c.code}`);
      console.log(`  Name: ${c.name}`);
      console.log(`  Phone: ${c.phone}`);
      console.log(`  Branch: ${c.branch?.name} (ID: ${c.branch_id})`);
      console.log(`  Created At: ${c.created_at.toISOString()}`);
      console.log(`  Updated At: ${c.updated_at.toISOString()}`);
    });
  }

  console.log('\n--- 2. Searching in Appointment table ---');
  const appointments = await prisma.appointment.findMany({
    where: {
      OR: searchPhones.map(phone => ({
        phone: { contains: phone }
      }))
    },
    include: {
      branch: true
    }
  });

  if (appointments.length === 0) {
    console.log('No appointments found with these phone numbers.');
  } else {
    appointments.forEach(a => {
      console.log(`Appointment ID: ${a.id}`);
      console.log(`  VTTech Code: ${a.vttech_code}`);
      console.log(`  Customer Name: ${a.customer_name}`);
      console.log(`  Phone: ${a.phone}`);
      console.log(`  Branch: ${a.branch?.name} (ID: ${a.branch_id})`);
      console.log(`  Date: ${a.appointment_date?.toISOString()}`);
      console.log(`  Status: ${a.status_name} (ID: ${a.status})`);
      console.log(`  Type: ${a.type_name}`);
      console.log(`  Created At: ${a.created_at.toISOString()}`);
    });
  }

  console.log('\n--- 3. Check sync tasks for June 16, 2026 ---');
  const targetDate = new Date('2026-06-16');
  const syncTasks = await prisma.syncTask.findMany({
    where: {
      date: targetDate
    }
  });

  if (syncTasks.length === 0) {
    console.log('No sync tasks found for 2026-06-16.');
  } else {
    syncTasks.forEach(t => {
      console.log(`Task ID: ${t.id} | Branch: ${t.branch_name} (ID: ${t.branch_id}) | Type: ${t.type} | Status: ${t.status} | Rec Count: ${t.records_count} | Appt Count: ${t.appointments_count} | Error: ${t.error_message}`);
    });
  }

  console.log('\n--- 4. Check crawl logs for June 16, 2026 ---');
  const crawlLogs = await prisma.crawlLog.findMany({
    where: {
      crawl_date: {
        gte: new Date('2026-06-16T00:00:00.000Z'),
        lte: new Date('2026-06-16T23:59:59.999Z')
      }
    },
    orderBy: { created_at: 'desc' },
    take: 20
  });

  if (crawlLogs.length === 0) {
    console.log('No crawl logs for crawl_date 2026-06-16.');
  } else {
    crawlLogs.forEach(l => {
      console.log(`[${l.created_at.toISOString()}] Branch: ${l.branch_id} | Type: ${l.crawl_type} | Status: ${l.status} | Msg: ${l.message} | Recs: ${l.records_count} | Err: ${l.error_message}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
