"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const stats = [];
    for (let year = 2019; year <= 2026; year++) {
        const start = new Date(`${year}-01-01`);
        const end = new Date(`${year}-12-31 23:59:59`);
        const count = await prisma.revenueTransaction.count({
            where: { date: { gte: start, lte: end } }
        });
        const sum = await prisma.revenueTransaction.aggregate({
            where: { date: { gte: start, lte: end } },
            _sum: { amount: true, paid: true }
        });
        stats.push({
            year,
            count,
            totalAmount: sum._sum.amount || 0,
            totalPaid: sum._sum.paid || 0
        });
    }
    console.log('--- YEARLY REVENUE STATS IN DATABASE ---');
    console.table(stats);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-yearly-stats.js.map