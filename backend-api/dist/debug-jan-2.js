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
    const date = '02-01-2019';
    console.log(`Testing Revenue for Branch 7 on ${date}...`);
    const res = await vttechApi.getRevenueByBranch(date, date, 7);
    console.log('Response length:', Array.isArray(res) ? res.length : 'Not an array');
    if (Array.isArray(res) && res.length > 0) {
        console.log('First item:', JSON.stringify(res[0]));
    }
    else {
        console.log('Raw response:', JSON.stringify(res));
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=debug-jan-2.js.map