"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const count = await prisma.revenueTransaction.count({
        where: {
            date: {
                gte: new Date('2019-06-01'),
                lte: new Date('2019-06-30 23:59:59'),
            }
        }
    });
    const sample = await prisma.revenueTransaction.findMany({
        where: {
            date: {
                gte: new Date('2019-06-01'),
                lte: new Date('2019-06-30 23:59:59'),
            }
        },
        take: 5
    });
    console.log(`Revenue Transactions for June 2019: ${count}`);
    if (sample.length > 0) {
        console.log('Sample record:', JSON.stringify(sample[0]));
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-june-2019.js.map