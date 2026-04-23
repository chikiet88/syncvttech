"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const count = await prisma.revenueTransaction.count({
        where: {
            date: {
                gte: new Date('2019-01-07'),
                lte: new Date('2019-01-07 23:59:59'),
            }
        }
    });
    console.log(`Revenue Transactions for 2019-01-07: ${count}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-jan-7.js.map