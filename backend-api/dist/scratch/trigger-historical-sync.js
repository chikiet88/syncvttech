"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const sync_service_1 = require("../src/sync.service");
async function main() {
    console.log('🔄 Đang khởi tạo ứng dụng NestJS...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const syncService = app.get(sync_service_1.SyncService);
    console.log('🚀 Đang kích hoạt tiến trình đồng bộ lịch sử (Historical Sync) thủ công...');
    await syncService.handleHistoricalSyncCron();
    console.log('✅ Đã xếp hàng các task thành công!');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=trigger-historical-sync.js.map