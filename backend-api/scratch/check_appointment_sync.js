const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const yesterday = new Date('2026-06-17T00:00:00+07:00');
  const today = new Date('2026-06-18T00:00:00+07:00');

  console.log('=== KIỂM TRA ĐỒNG BỘ LỊCH HẸN NGÀY 2026-06-17 ===\n');

  // 1. Appointments updated yesterday (synced)
  const updatedYesterday = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM appointments 
    WHERE updated_at >= ${yesterday} AND updated_at < ${today}`;
  console.log(`1. Appointments được cập nhật (synced) hôm qua: ${updatedYesterday[0].count}`);

  // 2. Appointments with appointment_date = yesterday
  const forYesterday = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM appointments 
    WHERE appointment_date >= ${yesterday} AND appointment_date < ${today}`;
  console.log(`2. Appointments có lịch hẹn hôm qua: ${forYesterday[0].count}`);

  // 3. Breakdown by branch
  const byBranch = await prisma.$queryRaw`
    SELECT branch_name, COUNT(*)::int as count 
    FROM appointments 
    WHERE appointment_date >= ${yesterday} AND appointment_date < ${today}
    GROUP BY branch_name ORDER BY count DESC`;
  console.log(`\n3. Chi tiết theo chi nhánh (appointment_date = hôm qua):`);
  byBranch.forEach(r => console.log(`   - ${r.branch_name || 'N/A'}: ${r.count} lịch hẹn`));

  // 4. Check SyncTask for yesterday
  const syncTasks = await prisma.$queryRaw`
    SELECT branch_name, type, status, appointments_count, records_count, 
           error_message, last_run_at, created_at
    FROM sync_tasks 
    WHERE date = '2026-06-17'::date
    ORDER BY branch_name, type`;
  console.log(`\n4. SyncTask ngày hôm qua (${syncTasks.length} tasks):`);
  
  const failedTasks = syncTasks.filter(t => t.status !== 'COMPLETED');
  const completedTasks = syncTasks.filter(t => t.status === 'COMPLETED');
  console.log(`   ✅ Hoàn thành: ${completedTasks.length}`);
  console.log(`   ❌ Chưa hoàn thành: ${failedTasks.length}`);
  
  if (failedTasks.length > 0) {
    console.log(`\n   Chi tiết tasks chưa hoàn thành:`);
    failedTasks.forEach(t => {
      console.log(`   - ${t.branch_name} [${t.type}]: status=${t.status}, error=${t.error_message || 'none'}`);
    });
  }

  // 5. Check CrawlLog for yesterday
  const crawlLogs = await prisma.$queryRaw`
    SELECT crawl_type, status, branch_id, appointments_count, records_count,
           error_message, created_at, duration_seconds
    FROM crawl_logs 
    WHERE crawl_date >= ${yesterday} AND crawl_date < ${today}
    ORDER BY created_at DESC
    LIMIT 30`;
  console.log(`\n5. CrawlLog ngày hôm qua (${crawlLogs.length} logs):`);
  
  const successLogs = crawlLogs.filter(l => l.status === 'success');
  const errorLogs = crawlLogs.filter(l => l.status === 'error');
  console.log(`   ✅ Success: ${successLogs.length}`);
  console.log(`   ❌ Error: ${errorLogs.length}`);
  
  const totalAppointmentsSynced = crawlLogs.reduce((sum, l) => sum + (l.appointments_count || 0), 0);
  console.log(`   📋 Tổng appointments_count trong crawl_logs: ${totalAppointmentsSynced}`);

  if (errorLogs.length > 0) {
    console.log(`\n   Chi tiết crawl errors:`);
    errorLogs.forEach(l => {
      console.log(`   - [${l.crawl_type}] branch_id=${l.branch_id}: ${l.error_message || 'unknown error'}`);
    });
  }

  // 6. Status breakdown for appointments with date yesterday
  const statusBreakdown = await prisma.$queryRaw`
    SELECT status_name, COUNT(*)::int as count 
    FROM appointments 
    WHERE appointment_date >= ${yesterday} AND appointment_date < ${today}
    GROUP BY status_name ORDER BY count DESC`;
  console.log(`\n6. Phân bổ trạng thái lịch hẹn hôm qua:`);
  statusBreakdown.forEach(r => console.log(`   - ${r.status_name || 'N/A'}: ${r.count}`));

  // 7. Last sync time
  const lastSync = await prisma.$queryRaw`
    SELECT MAX(updated_at) as last_update FROM appointments`;
  console.log(`\n7. Thời điểm cập nhật cuối cùng: ${lastSync[0].last_update}`);
}

main()
  .catch(e => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
