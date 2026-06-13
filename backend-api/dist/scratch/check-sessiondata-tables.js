"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const vttech_api_service_1 = require("../src/vttech-api.service");
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    await vttechApi.login();
    const result = await vttechApi.callApi('/api/Home/SessionData', {});
    for (const key of Object.keys(result)) {
        const list = result[key];
        if (Array.isArray(list) && list.length > 0) {
            console.log(`\n=== Table: ${key} (Length: ${list.length}) ===`);
            console.log('Sample item:', JSON.stringify(list[0], null, 2));
        }
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=check-sessiondata-tables.js.map