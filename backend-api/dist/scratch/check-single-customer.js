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
    const customerId = 198445;
    console.log(`\n======================================================`);
    console.log(`📡 FETCHING DETAILS FOR CUSTOMER ${customerId}`);
    console.log(`======================================================`);
    try {
        const anamnesis = await vttechApi.callHandler('/Customer/Anamnesis/CustomerAnamnesisList/', 'LoadataPatientHistory', { CustomerID: customerId });
        console.log(`\n- Anamnesis (Tiền sử):`, JSON.stringify(anamnesis, null, 2));
    }
    catch (e) {
        console.error(`- Anamnesis Error:`, e.message);
    }
    try {
        const care = await vttechApi.callHandler('/Customer/History/HistoryList_Care/', 'LoadataHistory', { CustomerID: customerId, limit: 100 });
        console.log(`\n- Care History (Tư vấn):`, JSON.stringify(care, null, 2));
    }
    catch (e) {
        console.error(`- Care History Error:`, e.message);
    }
    try {
        const complaints = await vttechApi.callHandler('/Customer/ComplaintList/', 'Loadata', { CustomerID: customerId });
        console.log(`\n- Complaints (Khiếu nại):`, JSON.stringify(complaints, null, 2));
    }
    catch (e) {
        console.error(`- Complaints Error:`, e.message);
    }
    try {
        const res = await vttechApi.callHandler('/Customer/Service/TabList/TabList_Service/', 'LoadataTab', { CustomerID: customerId });
        console.log(`\n- LoadataTab Response (Table1):`, JSON.stringify(res?.Table1 || res, null, 2));
    }
    catch (e) {
        console.error(`- LoadataTab Error:`, e.message);
    }
    try {
        const res = await vttechApi.callHandler('/Customer/Service/TabList/TabList_Service/', 'LoadataTab_Plan', { CustomerID: customerId });
        console.log(`\n- LoadataTab_Plan Response:`, JSON.stringify(res, null, 2));
    }
    catch (e) {
        console.error(`- LoadataTab_Plan Error:`, e.message);
    }
    await app.close();
}
test().catch(console.error);
//# sourceMappingURL=check-single-customer.js.map