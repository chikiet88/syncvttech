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
    const from = '01-01-2019';
    const to = '31-01-2019';
    console.log(`Testing Revenue for Branch 7 from ${from} to ${to}...`);
    const res = await vttechApi.getRevenueByBranch(from, to, 7);
    console.log('Response length:', Array.isArray(res) ? res.length : 'Not an array');
    if (Array.isArray(res) && res.length > 0) {
        console.log(`Total items found: ${res.length}`);
        const days = new Set();
        res.forEach(item => days.add(item.Date || item.date || item.RegDate));
        console.log('Days with data:', Array.from(days).sort());
    }
    else {
        console.log('Raw response:', JSON.stringify(res));
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=debug-jan-full.js.map