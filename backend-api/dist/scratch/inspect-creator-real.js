"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const sync_service_1 = require("../src/sync.service");
const prisma_service_1 = require("../src/prisma.service");
async function test() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const syncService = app.get(sync_service_1.SyncService);
    const prisma = app.get(prisma_service_1.PrismaService);
    console.log('🔄 Running syncMasterData(true)...');
    try {
        await syncService.syncMasterData(true);
        console.log('\n=== VERIFYING DATABASE STATE ===');
        const user160 = await prisma.user.findUnique({
            where: { id: 160 }
        });
        console.log('User 160 in database:', user160);
        const appointment = await prisma.appointment.findUnique({
            where: { id: 770703 }
        });
        if (appointment) {
            console.log('Appointment 770703:', {
                id: appointment.id,
                created_by_id: appointment.created_by_id,
                vttech_created_at: appointment.vttech_created_at,
                appointment_date: appointment.appointment_date,
            });
            const creatorId = appointment.created_by_id;
            if (creatorId) {
                const user = await prisma.user.findUnique({
                    where: { id: creatorId },
                    select: { full_name: true }
                });
                const employee = await prisma.employee.findUnique({
                    where: { id: creatorId },
                    select: { name: true }
                });
                console.log('Resolution path:');
                console.log(`- From Users table: "${user?.full_name || 'not found'}"`);
                console.log(`- From Employees table: "${employee?.name || 'not found'}"`);
                const finalName = user?.full_name || employee?.name || 'Unknown';
                console.log(`=> Resolved Creator Name: "${finalName}"`);
            }
            else {
                console.log('Appointment has no created_by_id. Let\'s sync June 3rd range to fetch it!');
                console.log('🔄 Triggering sync for June 3rd (Branch 6)...');
                await syncService.syncByRange('2026-06-03', '2026-06-03', false, false, false);
                const updatedAppt = await prisma.appointment.findUnique({
                    where: { id: 770703 }
                });
                console.log('Updated Appointment 770703:', updatedAppt);
                if (updatedAppt?.created_by_id) {
                    const user = await prisma.user.findUnique({
                        where: { id: updatedAppt.created_by_id },
                        select: { full_name: true }
                    });
                    const employee = await prisma.employee.findUnique({
                        where: { id: updatedAppt.created_by_id },
                        select: { name: true }
                    });
                    console.log(`=> Resolved Creator Name after sync: "${user?.full_name || employee?.name || 'Unknown'}"`);
                }
            }
        }
        else {
            console.log('Appointment 770703 not found in local DB.');
        }
    }
    catch (e) {
        console.error('Error during verification:', e.message);
    }
    await app.close();
}
test();
//# sourceMappingURL=inspect-creator-real.js.map