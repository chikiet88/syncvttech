"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const DATE_FROM = new Date('2026-04-01T00:00:00');
const DATE_TO = new Date('2026-04-30T23:59:59.999');
const TAZA_BRANCH_IDS = [1, 2, 3, 4, 6, 23, 26];
async function main() {
    const branches = await prisma.branch.findMany({
        where: { id: { in: TAZA_BRANCH_IDS } },
    });
    const branchMap = new Map(branches.map(b => [b.id, b.name]));
    console.log('Status distribution for Taza branches in April 2026:');
    for (const bId of TAZA_BRANCH_IDS) {
        const stats = await prisma.appointment.groupBy({
            by: ['status'],
            _count: { id: true },
            where: {
                branch_id: bId,
                appointment_date: { gte: DATE_FROM, lte: DATE_TO },
            },
        });
        console.log(`\nBranch: ${branchMap.get(bId) || `CN #${bId}`} (ID: ${bId})`);
        if (stats.length === 0) {
            console.log('  No appointments');
        }
        for (const s of stats) {
            console.log(`  - Status ${s.status}: ${s._count.id} appointments`);
        }
    }
    await prisma.$disconnect();
}
main().catch(console.error);
//# sourceMappingURL=check-taza-status.js.map