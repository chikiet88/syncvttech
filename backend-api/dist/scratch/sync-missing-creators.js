"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const prisma_service_1 = require("../src/prisma.service");
const vttech_api_service_1 = require("../src/vttech-api.service");
let TempModule = class TempModule {
};
TempModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => {
                    let host = configService.get('REDIS_HOST') || 'localhost';
                    let port = configService.get('REDIS_PORT') || 6379;
                    if (host === 'tazagroupnet-redis' && process.env.NODE_ENV !== 'production') {
                        host = 'localhost';
                        port = 12004;
                    }
                    return {
                        connection: {
                            host,
                            port,
                            password: configService.get('REDIS_PASSWORD'),
                        },
                    };
                },
                inject: [config_1.ConfigService],
            }),
            bullmq_1.BullModule.registerQueue({
                name: 'sync-queue',
            }),
        ],
        providers: [prisma_service_1.PrismaService, vttech_api_service_1.VttechApiService],
    })
], TempModule);
async function main() {
    console.log('Initializing Temp NestJS application context (No BullMQ Workers)...');
    const app = await core_1.NestFactory.createApplicationContext(TempModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    const prisma = app.get(prisma_service_1.PrismaService);
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
    const map = new Map();
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
    async function syncPair(dateStr, branchId) {
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
                if (!id)
                    continue;
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
        }
        catch (e) {
            console.error(`Error syncing ${dateStr} - Branch ${branchId}:`, e.message);
        }
    }
    const concurrency = 1;
    let index = 0;
    async function worker() {
        while (index < pairs.length) {
            const currentIdx = index++;
            const pair = pairs[currentIdx];
            if (!pair)
                break;
            await syncPair(pair.dateStr, pair.branchId);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    console.log(`Starting sync with ${concurrency} parallel worker...`);
    const startTime = Date.now();
    await Promise.all(Array.from({ length: concurrency }).map(worker));
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Sync completed in ${duration}s!`);
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
//# sourceMappingURL=sync-missing-creators.js.map