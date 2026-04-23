"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const dateStr = '2026-04-22';
    const start = new Date(dateStr);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);
    console.log(`Starting cleanup for ${dateStr}...`);
    const delRevenue = await prisma.revenueTransaction.deleteMany({
        where: { date: { gte: start, lte: end } }
    });
    console.log(`Deleted ${delRevenue.count} Revenue Transactions.`);
    const delTasks = await prisma.syncTask.deleteMany({
        where: { date: { gte: start, lte: end } }
    });
    console.log(`Deleted ${delTasks.count} Sync Tasks.`);
    const delDaily = await prisma.dailyCustomer.deleteMany({
        where: { date: { gte: start, lte: end } }
    });
    console.log(`Deleted ${delDaily.count} Daily Customer records.`);
    console.log('Cleanup completed successfully.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=cleanup-22-april.js.map