"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const sync_service_1 = require("./sync.service");
const prisma_service_1 = require("./prisma.service");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const syncService = app.get(sync_service_1.SyncService);
    const prisma = app.get(prisma_service_1.PrismaService);
    const dateStr = '2026-04-22';
    console.log(`🚀 Starting DIRECT re-sync for ${dateStr}...`);
    const branches = await prisma.branch.findMany({ where: { is_active: 1 } });
    for (const branch of branches) {
        console.log(`\n--- Syncing Branch ${branch.id}: ${branch.name} ---`);
        try {
            await syncService.processQueuedRevenueDay(dateStr, branch.id);
            console.log(`✅ Revenue synced for ${branch.name}`);
            await syncService.syncAppointments(dateStr, dateStr, branch.id);
            console.log(`✅ Appointments synced for ${branch.name}`);
        }
        catch (e) {
            console.error(`❌ Error syncing branch ${branch.name}: ${e.message}`);
        }
    }
    console.log('\n🚀 ALL DONE!');
    await app.close();
}
bootstrap().catch(console.error);
//# sourceMappingURL=direct-sync-22-april.js.map