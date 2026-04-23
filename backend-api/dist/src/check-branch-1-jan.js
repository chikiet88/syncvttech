"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const transactions = await prisma.revenueTransaction.findMany({
        where: {
            branch_id: 1,
            date: {
                gte: new Date('2019-01-01'),
                lte: new Date('2019-01-31'),
            }
        },
        orderBy: { date: 'asc' }
    });
    console.log(`--- BRANCH 1 TRANSACTIONS JAN 2019 (${transactions.length} items) ---`);
    transactions.forEach(t => {
        console.log(`Date: ${t.date.toISOString().split('T')[0]} | Amount: ${t.amount} | Customer: ${t.customer_name}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-branch-1-jan.js.map