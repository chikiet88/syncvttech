"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const sync_service_1 = require("../src/sync.service");
const client_1 = require("@prisma/client");
async function main() {
    console.log('Bootstrapping NestJS...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const syncService = app.get(sync_service_1.SyncService);
    const prisma = app.get(client_1.PrismaClient);
    const branches = await prisma.branch.findMany();
    const dates = [];
    const start = new Date('2026-04-01');
    const end = new Date('2026-04-30');
    let curr = new Date(start);
    while (curr <= end) {
        dates.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }
    console.log(`Starting fast sync for ${dates.length} days and ${branches.length} branches...`);
    for (const dateStr of dates) {
        console.log(`📅 Syncing appointments for date: ${dateStr}...`);
        const promises = branches.map(branch => {
            return syncService.syncAppointments(dateStr, dateStr, branch.id).catch((e) => {
                console.error(`  Error syncing branch ${branch.id} on ${dateStr}:`, e.message);
            });
        });
        await Promise.all(promises);
    }
    console.log('Appointments sync completed!');
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=sync-april-appointments.js.map