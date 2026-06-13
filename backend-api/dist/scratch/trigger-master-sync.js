"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const sync_service_1 = require("../src/sync.service");
async function main() {
    console.log('Bootstrapping NestJS application context...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    console.log('Resolving SyncService...');
    const syncService = app.get(sync_service_1.SyncService);
    const todayStr = '2026-06-13';
    console.log(`Starting sync for ${todayStr} with forceMaster=true to update service groups...`);
    await syncService.syncByRange(todayStr, todayStr, true, false, false);
    console.log('Sync completed successfully!');
    await app.close();
}
main().catch(err => {
    console.error('Master sync failed:', err);
    process.exit(1);
});
//# sourceMappingURL=trigger-master-sync.js.map