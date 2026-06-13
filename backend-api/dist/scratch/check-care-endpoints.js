"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const vttech_api_service_1 = require("../src/vttech-api.service");
async function test() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    console.log('🔄 Logging in...');
    await vttechApi.login();
    await vttechApi.getXsrfToken();
    const customerId = 39002;
    console.log(`\nChecking care history endpoints for customer ${customerId}:`);
    try {
        const res1 = await vttechApi.callHandler('/Customer/History/HistoryList_Care/', 'LoadataHistory', { CustomerID: customerId, limit: 10 });
        console.log(`\n- Endpoint 1 (/Customer/History/HistoryList_Care/ - LoadataHistory) length:`, Array.isArray(res1?.Table || res1) ? (res1?.Table || res1).length : typeof res1);
        console.log('Sample:', JSON.stringify((res1?.Table || res1)?.slice(0, 1), null, 2));
    }
    catch (e) {
        console.error(`- Endpoint 1 Error:`, e.message);
    }
    try {
        const res2 = await vttechApi.callHandler('/Customer/HistoryList_Care/', 'LoadataHistory', { CustomerID: customerId, limit: 10 });
        console.log(`\n- Endpoint 2 (/Customer/HistoryList_Care/ - LoadataHistory) length:`, Array.isArray(res2?.Table || res2) ? (res2?.Table || res2).length : typeof res2);
        console.log('Sample:', JSON.stringify((res2?.Table || res2)?.slice(0, 1), null, 2));
    }
    catch (e) {
        console.error(`- Endpoint 2 Error:`, e.message);
    }
    try {
        const res3 = await vttechApi.callHandler('/Customer/HistoryList_Care/', 'Loadata', { CustomerID: customerId, limit: 10 });
        console.log(`\n- Endpoint 3 (/Customer/HistoryList_Care/ - Loadata) length:`, Array.isArray(res3?.Table || res3) ? (res3?.Table || res3).length : typeof res3);
        console.log('Sample:', JSON.stringify((res3?.Table || res3)?.slice(0, 1), null, 2));
    }
    catch (e) {
        console.error(`- Endpoint 3 Error:`, e.message);
    }
    await app.close();
}
test().catch(console.error);
//# sourceMappingURL=check-care-endpoints.js.map