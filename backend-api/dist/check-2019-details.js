"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const transactions = await prisma.revenueTransaction.findMany({
        where: {
            date: {
                gte: new Date('2019-01-01'),
                lte: new Date('2019-01-10'),
            }
        },
        include: { branch: true }
    });
    console.log(`--- REVENUE TRANSACTIONS 2019-01-01 to 2019-01-10 (${transactions.length} items) ---`);
    transactions.forEach(t => {
        console.log(`ID: ${t.id} | Date: ${t.date.toISOString().split('T')[0]} | Branch: ${t.branch?.name} | Amount: ${t.amount} | Paid: ${t.paid} | Customer: ${t.customer_name}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-2019-details.js.map