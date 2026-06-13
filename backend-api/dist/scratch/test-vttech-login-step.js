"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const vttech_api_service_1 = require("../src/vttech-api.service");
async function main() {
    console.log('Starting Nest context for testing login step...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    const s = vttechApi.sessions[0];
    console.log(`Testing login for session: ${s.username}`);
    const axiosInstance = vttechApi.axiosInstance;
    const baseUrl = vttechApi.baseUrl;
    console.log('Sending direct GET request to /Login/Login...');
    const start = Date.now();
    try {
        const res = await axiosInstance.get('/Login/Login?ver=' + Date.now(), {
            session: s,
            timeout: 12000,
        });
        console.log(`Success GET /Login/Login in ${Date.now() - start}ms! Status: ${res.status}`);
    }
    catch (err) {
        console.error(`Failed GET /Login/Login in ${Date.now() - start}ms:`, err.message);
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=test-vttech-login-step.js.map