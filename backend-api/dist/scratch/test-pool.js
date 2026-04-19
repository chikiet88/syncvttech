"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const vttech_api_service_1 = require("../src/vttech-api.service");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const service = app.get(vttech_api_service_1.VttechApiService);
    console.log('--- TESTING MULTI-ACCOUNT LOGIN ---');
    const status = await service.checkLoginStatus();
    console.log('Result:', JSON.stringify(status, null, 2));
    await app.close();
}
bootstrap().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
//# sourceMappingURL=test-pool.js.map