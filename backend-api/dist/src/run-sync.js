"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const sync_service_1 = require("./sync.service");
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const syncService = app.get(sync_service_1.SyncService);
    const today = '2026-04-07';
    console.log(`Starting sync for ${today}...`);
    await syncService.syncByRange(today, today, false, false, true);
    console.log('Sync finished!');
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=run-sync.js.map