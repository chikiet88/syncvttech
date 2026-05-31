"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const DATE_FROM = new Date('2026-04-01T00:00:00');
const DATE_TO = new Date('2026-04-30T23:59:59.999');
async function main() {
    const counts = await prisma.appointment.groupBy({
        by: ['branch_id'],
        _count: {
            id: true,
        },
        where: {
            appointment_date: { gte: DATE_FROM, lte: DATE_TO },
        },
    });
    const branches = await prisma.branch.findMany();
    const branchMap = new Map(branches.map(b => [b.id, b.name]));
    console.log('Appointments Count by Branch (All Statuses) in April 2026:');
    for (const c of counts) {
        console.log(`- ${branchMap.get(c.branch_id || 0) || 'Unknown'} (ID: ${c.branch_id}): ${c._count.id}`);
    }
    console.log('\nAppointments Count by Branch (Filtered Statuses 2,4,5,6,7) in April 2026:');
    const countsFiltered = await prisma.appointment.groupBy({
        by: ['branch_id'],
        _count: {
            id: true,
        },
        where: {
            appointment_date: { gte: DATE_FROM, lte: DATE_TO },
            status: { in: [2, 4, 5, 6, 7] },
        },
    });
    for (const c of countsFiltered) {
        console.log(`- ${branchMap.get(c.branch_id || 0) || 'Unknown'} (ID: ${c.branch_id}): ${c._count.id}`);
    }
    await prisma.$disconnect();
}
main().catch(console.error);
//# sourceMappingURL=count-by-branch.js.map