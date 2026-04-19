"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('--- Detailed Database Inspection ---');
    const recentDaily = await prisma.dailyCustomer.findMany({
        take: 5,
        orderBy: { created_at: 'desc' }
    });
    console.log('Recent Daily Customers:', JSON.stringify(recentDaily, null, 2));
    const recentRevenue = await prisma.revenueTransaction.findMany({
        take: 5,
        orderBy: { synced_at: 'desc' }
    });
    console.log('Recent Revenue Transactions:', JSON.stringify(recentRevenue, null, 2));
    const countDailyTotal = await prisma.dailyCustomer.count();
    console.log('Total Daily Customers:', countDailyTotal);
    const countRevenueTotal = await prisma.revenueTransaction.count();
    console.log('Total Revenue Transactions:', countRevenueTotal);
}
main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
//# sourceMappingURL=debug-db-detailed.js.map