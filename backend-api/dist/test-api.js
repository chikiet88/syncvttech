"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const sync_service_1 = require("./sync.service");
async function test() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const sync = app.get(sync_service_1.SyncService);
    const dateStart = '2026-04-01';
    const dateEnd = '2026-04-04';
    console.log(`🚀 Starting Sweep Sync for all branches from ${dateStart} to ${dateEnd}...`);
    await sync.syncByRange(dateStart, dateEnd);
    console.log('✅ Sweep Sync completed.');
    await app.close();
}
test().catch(console.error);
//# sourceMappingURL=test-api.js.map