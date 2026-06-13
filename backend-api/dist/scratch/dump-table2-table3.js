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
    const services = result.Table2 || [];
    const groups = result.Table3 || [];
    console.log('=== SERVICE GROUPS (Table3) ===');
    groups.slice(0, 30).forEach((g) => {
        console.log(`ID: ${g.ID} | Name: ${g.Name} | Color: ${g.Color}`);
    });
    console.log('\n=== SERVICES (Table2) ===');
    services.slice(0, 30).forEach((s) => {
        console.log(`ID: ${s.ID} | Name: ${s.Name} | Code: ${s.Code} | Type: ${s.Type} | Color: ${s.Color} | State: ${s.State}`);
    });
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=dump-table2-table3.js.map