"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const tasks = await prisma.syncTask.findMany({
        where: {
            date: {
                gte: new Date('2019-01-01'),
                lte: new Date('2019-01-10'),
            },
        },
        orderBy: { date: 'asc' },
        take: 20,
    });
    console.log('--- SYNC TASKS 2019-01-01 to 2019-01-10 ---');
    tasks.forEach(t => {
        console.log(`ID: ${t.id} | Date: ${t.date.toISOString().split('T')[0]} | Branch: ${t.branch_id} | Status: ${t.status} | Updated: ${t.updated_at}`);
    });
    const revCount = await prisma.revenueTransaction.count({
        where: {
            date: {
                gte: new Date('2019-01-01'),
                lte: new Date('2019-01-10'),
            }
        }
    });
    console.log(`Total Revenue Transactions for this range: ${revCount}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-2019.js.map