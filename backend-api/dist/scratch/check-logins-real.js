"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const vttech_api_service_1 = require("../src/vttech-api.service");
async function check() {
    console.log('🔄 Đang khởi tạo ứng dụng NestJS để kiểm tra tài khoản...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    console.log('📡 Đang kiểm tra trạng thái đăng nhập của tất cả các tài khoản...');
    const status = await vttechApi.checkLoginStatus();
    console.log('\n=== KẾT QUẢ ĐĂNG NHẬP ===');
    console.log(`- Trạng thái tổng: ${status.success ? '✅ THÀNH CÔNG' : '❌ THẤT BẠI'}`);
    console.log(`- Thông điệp: ${status.message}`);
    console.log(`- Tổng số tài khoản: ${status.accounts}`);
    console.log('\nChi tiết từng tài khoản:');
    status.details.forEach(d => {
        console.log(`  * ${d.username}: ${d.success ? '✅ OK' : '❌ FAILED'}`);
    });
    await app.close();
}
check().catch(console.error);
//# sourceMappingURL=check-logins-real.js.map