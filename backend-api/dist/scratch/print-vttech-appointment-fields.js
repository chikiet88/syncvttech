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
    const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
        DateFrom: '2026-06-03',
        BranchID: '1',
        AppID: '0',
        StatusID: '0',
        DoctorID: '0',
        TypeApp: '1',
    });
    const appointments = Array.isArray(res) ? res : (res?.Table || res?.Data || []);
    console.log(`Found ${appointments.length} appointments.`);
    if (appointments.length > 0) {
        console.log('Sample appointment:', JSON.stringify(appointments[0], null, 2));
        console.log('Checking all appointments keys...');
        const keys = new Set();
        appointments.forEach((a) => {
            Object.keys(a).forEach(k => keys.add(k));
        });
        console.log('All keys:', Array.from(keys));
        console.log('\nSearching for fields containing "phễu" or similar:');
        appointments.forEach((a) => {
            Object.entries(a).forEach(([k, v]) => {
                if (typeof v === 'string' && v.toLowerCase().includes('phễu')) {
                    console.log(`Found value containing "phễu": key "${k}" = "${v}" (App ID: ${a.ID || a.ScheduleID})`);
                }
            });
        });
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=print-vttech-appointment-fields.js.map