"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const sync_service_1 = require("./sync.service");
async function test() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const sync = app.get(sync_service_1.SyncService);
    const branches = [1, 2, 3, 4, 5, 6, 7];
    const dates = ['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04'];
    console.log('--- Sweep Syncing Revenue for April ---');
    for (const date of dates) {
        for (const bId of branches) {
            console.log(`Syncing Branch ${bId} on ${date}...`);
            try {
                await sync.processQueuedRevenueDay(date, bId);
            }
            catch (e) {
                console.error(`Failed Branch ${bId} on ${date}:`, e.message);
            }
        }
    }
    console.log('✅ Sweep sync finished.');
    await app.close();
}
test().catch(console.error);
//# sourceMappingURL=test-api.js.map