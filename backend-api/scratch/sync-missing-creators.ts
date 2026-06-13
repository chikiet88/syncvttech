import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '../src/prisma.service';
import { VttechApiService } from '../src/vttech-api.service';

// Tạo một Module tối giản chỉ chứa những dependency cần thiết
// để tránh khởi động BullMQ Workers (SyncProcessor) hay các cron job tự động
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        let host = configService.get<string>('REDIS_HOST') || 'localhost';
        let port = configService.get<number>('REDIS_PORT') || 6379;
        
        if (host === 'tazagroupnet-redis' && process.env.NODE_ENV !== 'production') {
           host = 'localhost';
           port = 12004;
        }

        return {
          connection: {
            host,
            port,
            password: configService.get<string>('REDIS_PASSWORD'),
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'sync-queue',
    }),
  ],
  providers: [PrismaService, VttechApiService],
})
class TempModule {}

async function main() {
  console.log('Initializing Temp NestJS application context (No BullMQ Workers)...');
  const app = await NestFactory.createApplicationContext(TempModule);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);

  console.log('Querying appointments with null creator from 2026-01-01...');
  const nullApps = await prisma.appointment.findMany({
    where: {
      appointment_date: {
        gte: new Date('2026-01-01T00:00:00.000Z'),
      },
      created_by_id: null,
    },
    select: {
      id: true,
      appointment_date: true,
      branch_id: true,
    }
  });

  console.log(`Found ${nullApps.length} appointments with null creator.`);
  if (nullApps.length === 0) {
    console.log('No appointments to sync!');
    await app.close();
    return;
  }

  // Gom nhóm theo (date, branch_id) và sort theo ngày giảm dần để ưu tiên dữ liệu mới nhất
  const map = new Map<string, { dateStr: string, branchId: number }>();
  nullApps.forEach(a => {
    if (a.appointment_date && a.branch_id) {
      const dateStr = a.appointment_date.toISOString().split('T')[0];
      const key = `${dateStr}_${a.branch_id}`;
      map.set(key, { dateStr, branchId: a.branch_id });
    }
  });

  const pairs = Array.from(map.values()).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  console.log(`Total unique (date, branch_id) pairs to sync (sorted by date desc): ${pairs.length}`);

  let completed = 0;
  const total = pairs.length;

  async function syncPair(dateStr: string, branchId: number) {
    try {
      const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
        DateFrom: dateStr,
        BranchID: branchId.toString(),
        AppID: '0',
        StatusID: '0',
        DoctorID: '0',
        TypeApp: '1',
      });

      const appointments = Array.isArray(res) ? res : [];
      let updated = 0;
      for (const a of appointments) {
        const id = parseInt(a.ID || a.ScheduleID || a.id || a.AppID);
        if (!id) continue;
        const createdById = parseInt(a.CreatedPer || a.CreatedID) || null;
        const vttechCreatedAt = a.CreatedDate || a.Created ? new Date(a.CreatedDate || a.Created) : null;
        const vttechCode = a.Code || a.CodeScheduler || null;

        await prisma.appointment.updateMany({
          where: { id },
          data: {
            created_by_id: createdById,
            vttech_created_at: vttechCreatedAt,
            vttech_code: vttechCode
          }
        });
        updated++;
      }
      completed++;
      if (completed % 10 === 0 || completed === total) {
        console.log(`Progress: ${completed}/${total} pairs (${Math.round((completed / total) * 100)}%) | Last: ${dateStr} Branch ${branchId} updated ${updated} records`);
      }
    } catch (e: any) {
      console.error(`Error syncing ${dateStr} - Branch ${branchId}:`, e.message);
    }
  }

  // Chạy concurrency worker
  const concurrency = 1; // Sử dụng 1 worker chạy tuần tự để đảm bảo an toàn tuyệt đối và tránh timeout/CB
  let index = 0;

  async function worker() {
    while (index < pairs.length) {
      const currentIdx = index++;
      const pair = pairs[currentIdx];
      if (!pair) break;
      await syncPair(pair.dateStr, pair.branchId);
      // Nghỉ 300ms giữa các request để VTTech API không bị quá tải
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log(`Starting sync with ${concurrency} parallel worker...`);
  const startTime = Date.now();
  await Promise.all(Array.from({ length: concurrency }).map(worker));
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`Sync completed in ${duration}s!`);

  // Thống kê lại số lượng null
  const remainingNull = await prisma.appointment.count({
    where: {
      appointment_date: {
        gte: new Date('2026-01-01T00:00:00.000Z'),
      },
      created_by_id: null,
    }
  });
  console.log(`Remaining appointments with null creator: ${remainingNull}`);

  await app.close();
}

main().catch(console.error);
