"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const vttech_api_service_1 = require("../src/vttech-api.service");
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    await vttechApi.login();
    console.log('Logged in successfully!');
    const result = await vttechApi.callApi('/api/Home/SessionData', {});
    console.log('Keys in SessionData:', Object.keys(result));
    if (result.Table2 && result.Table2.length > 0) {
        console.log('Sample service:', JSON.stringify(result.Table2[0], null, 2));
        const keys = new Set();
        result.Table2.forEach((s) => {
            Object.keys(s).forEach(k => keys.add(k));
        });
        console.log('All Service fields in Table2:', Array.from(keys));
        console.log('First 5 services in SessionData Table2:');
        result.Table2.slice(0, 5).forEach((s) => {
            console.log(`ID: ${s.ID} | Name: ${s.Name} | GroupID: ${s.GroupID} | Group_ID: ${s.Group_ID} | ServiceGroup: ${s.ServiceGroup} | Category: ${s.Category || s.CatID || s.CategoryID || s.ServiceCatID}`);
            console.log('Raw service object:', s);
        });
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=check-sessiondata-services.js.map