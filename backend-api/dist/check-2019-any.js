"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const count = await prisma.revenueTransaction.count({
        where: {
            date: {
                gte: new Date('2019-01-02'),
                lte: new Date('2019-12-31 23:59:59'),
            }
        }
    });
    const firstRecord = await prisma.revenueTransaction.findFirst({
        where: {
            date: {
                gte: new Date('2019-01-02'),
                lte: new Date('2019-12-31 23:59:59'),
            }
        },
        orderBy: { date: 'asc' }
    });
    console.log(`Total Revenue Transactions in 2019 (excluding Jan 1st): ${count}`);
    if (firstRecord) {
        console.log(`First record after Jan 1st: ${firstRecord.date.toISOString()} | Branch: ${firstRecord.branch_id}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-2019-any.js.map