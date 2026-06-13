"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const vttech_api_service_1 = require("../src/vttech-api.service");
const prisma_service_1 = require("../src/prisma.service");
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    const prisma = app.get(prisma_service_1.PrismaService);
    const branches = await prisma.branch.findMany();
    console.log(`Checking ${branches.length} branches...`);
    for (const branch of branches) {
        const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
            DateFrom: '2026-06-03',
            BranchID: branch.id.toString(),
            AppID: '0',
            StatusID: '0',
            DoctorID: '0',
            TypeApp: '1',
        });
        const appointments = Array.isArray(res) ? res : [];
        if (appointments.length > 0) {
            console.log(`Branch ${branch.id} (${branch.name}): ${appointments.length} appointments`);
            const target = appointments.find((a) => String(a.Phone || a.Mobile || a.CustPhone).includes('383779095') || a.ID === 771337 || a.ScheduleID === 771337);
            if (target) {
                console.log('Target Appointment Details:', JSON.stringify(target, null, 2));
            }
        }
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=check-vttech-appointments.js.map