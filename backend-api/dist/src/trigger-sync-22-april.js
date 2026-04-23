"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const sync_service_1 = require("./sync.service");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const syncService = app.get(sync_service_1.SyncService);
    const dateStr = '2026-04-22';
    console.log(`Triggering re-sync for ${dateStr}...`);
    await syncService.seedSyncTasks(dateStr, dateStr);
    console.log('SyncTasks seeded.');
    console.log('Pushing tasks to queue...');
    await syncService.pushPendingTasksToQueue(100);
    console.log('Tasks pushed to BullMQ.');
    await app.close();
}
bootstrap().catch(console.error);
//# sourceMappingURL=trigger-sync-22-april.js.map