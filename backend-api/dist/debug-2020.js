"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const vttech_api_service_1 = require("./vttech-api.service");
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    await vttechApi.login();
    await vttechApi.getXsrfToken();
    const date = '01-01-2020';
    console.log(`Testing Revenue for ALL Branches on ${date}...`);
    const res = await vttechApi.getRevenueByBranch(date, date, 1);
    console.log('Branch 1 response:', JSON.stringify(res));
    const res7 = await vttechApi.getRevenueByBranch(date, date, 7);
    console.log('Branch 7 response:', JSON.stringify(res7));
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=debug-2020.js.map