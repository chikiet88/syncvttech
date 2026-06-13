"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const vttech_api_service_1 = require("../src/vttech-api.service");
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    await vttechApi.login();
    try {
        const result = await vttechApi.callHandler('/Customer/ListCustomer/', 'LoadIni', {});
        console.log('Keys in LoadIni Data:', Object.keys(result));
        let servicesKey = 'Services';
        if (!result[servicesKey]) {
            servicesKey = Object.keys(result).find(k => k.toLowerCase() === 'services') || 'Services';
        }
        const services = result[servicesKey];
        if (Array.isArray(services)) {
            console.log(`\n=== Key: ${servicesKey} (Length: ${services.length}) ===`);
            if (services.length > 0) {
                console.log('Sample service:', JSON.stringify(services[0], null, 2));
                const keys = new Set();
                services.forEach((s) => {
                    Object.keys(s).forEach(k => keys.add(k));
                });
                console.log('All fields in services:', Array.from(keys));
                console.log('First 5 services:');
                services.slice(0, 5).forEach((s) => {
                    console.log(`ID: ${s.ID} | Name: ${s.Name} | Code: ${s.Code} | GroupID: ${s.GroupID || s.GroupID_ || s.GroupID1 || s.GroupID2} | Category: ${s.Category || s.CategoryID || s.ServiceCatID}`);
                    console.log('Raw service object:', s);
                });
            }
        }
        else {
            console.log(`Key ${servicesKey} is not an array, type:`, typeof services);
        }
    }
    catch (e) {
        console.error('Failed to call LoadIni:', e.message);
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=check-loadini-services.js.map