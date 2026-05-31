"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const vttech_api_service_1 = require("../src/vttech-api.service");
async function main() {
    console.log('Bootstrapping NestJS context...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    console.log('Logging in and calling API...');
    try {
        const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
            DateFrom: '2026-05-25',
            BranchID: '1',
            AppID: '0',
            StatusID: '0',
            DoctorID: '0',
            TypeApp: '1',
        });
        const items = Array.isArray(res) ? res : (res?.Table || []);
        console.log(`Fetched ${items.length} appointments for 2026-05-25`);
        const statusMap = new Map();
        for (const item of items) {
            const statusId = parseInt(item.TypeStatusID || item.Status || item.StatusID || item.State || '0');
            const statusLabel = item.StatusName || item.TypeName || item.StateName || item.StatusText || 'Unknown';
            if (!statusMap.has(statusId)) {
                statusMap.set(statusId, new Set());
            }
            statusMap.get(statusId).add(statusLabel);
        }
        console.log('\n--- STATUS MAPPINGS FOUND ---');
        for (const [id, labels] of statusMap.entries()) {
            console.log(`Status ID ${id}: ${Array.from(labels).join(', ')}`);
        }
        if (items.length > 0) {
            console.log('\nSample Appointment Row:');
            console.log(JSON.stringify(items[0], null, 2));
        }
    }
    catch (error) {
        console.error('Error during execution:', error.message);
    }
    finally {
        await app.close();
    }
}
main().catch(console.error);
//# sourceMappingURL=get-status-names.js.map