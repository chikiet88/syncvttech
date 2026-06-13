"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const vttech_api_service_1 = require("../src/vttech-api.service");
const client_1 = require("@prisma/client");
async function test() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    const prisma = new client_1.PrismaClient({
        datasources: {
            db: {
                url: "postgresql://postgres:postgres@localhost:12003/db_tazagroup_vttech_sync"
            }
        }
    });
    console.log('🔄 Logging in...');
    await vttechApi.login();
    await vttechApi.getXsrfToken();
    const start = new Date('2026-06-01T00:00:00.000Z');
    const end = new Date('2026-06-01T23:59:59.999Z');
    const dailyCusts = await prisma.dailyCustomer.findMany({
        where: { date: { gte: start, lte: end } }
    });
    const customerIds = [...new Set(dailyCusts.map(c => c.customer_id))].slice(0, 30);
    console.log(`Checking treatment plans and care history for ${customerIds.length} customers...`);
    for (const customerId of customerIds) {
        try {
            const res = await vttechApi.callHandler('/Customer/Service/TabList/TabList_Service/', 'LoadataTab', { CustomerID: customerId });
            const table1 = res?.Table1 || [];
            const table = res?.Table || [];
            const careRes = await vttechApi.callHandler('/Customer/History/HistoryList_Care/', 'LoadataHistory', { CustomerID: customerId, limit: 100 });
            const careItems = careRes?.Table || careRes || [];
            if (table1.length > 0 || table.length > 0 || careItems.length > 0) {
                console.log(`Customer ${customerId}:`);
                if (table1.length > 0)
                    console.log(`  - Table1 (Plans) count: ${table1.length}`);
                if (table.length > 0)
                    console.log(`  - Table (Services) count: ${table.length}`);
                if (careItems.length > 0)
                    console.log(`  - Care History count: ${careItems.length}`);
            }
        }
        catch (e) {
            console.log(`Error checking customer ${customerId}: ${e.message}`);
        }
    }
    await prisma.$disconnect();
    await app.close();
}
test().catch(console.error);
//# sourceMappingURL=check-treatment-plans-all.js.map