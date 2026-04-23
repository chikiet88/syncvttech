"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const dateStr = '2026-04-22';
    const start = new Date(dateStr);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);
    console.log(`Summary for ${dateStr} (Filtered by Type=1 for Sales/Revenue):`);
    const branches = await prisma.branch.findMany({ where: { is_active: 1 } });
    const results = await Promise.all(branches.map(async (b) => {
        const revenueData = await prisma.revenueTransaction.aggregate({
            where: {
                branch_id: b.id,
                date: { gte: start, lte: end },
                type: 1
            },
            _sum: { amount: true, paid: true }
        });
        const count = await prisma.revenueTransaction.count({
            where: { branch_id: b.id, date: { gte: start, lte: end } }
        });
        return {
            Branch: b.name,
            ID: b.id,
            Records: count,
            Sales: revenueData._sum?.amount || 0,
            Revenue: revenueData._sum?.paid || 0
        };
    }));
    console.table(results);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-summary-after-sync.js.map