"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const firstRecord = await prisma.revenueTransaction.findFirst({
        where: {
            date: {
                gt: new Date('2019-01-01 23:59:59'),
            }
        },
        orderBy: { date: 'asc' }
    });
    if (firstRecord) {
        console.log(`The FIRST record after 2019-01-01 is on: ${firstRecord.date.toISOString()} | Branch: ${firstRecord.branch_id} | Customer: ${firstRecord.customer_name}`);
    }
    else {
        console.log('NO records found after 2019-01-01 in the entire database!');
    }
    const latestSuccessInBacklog = await prisma.syncTask.findFirst({
        where: { status: 'SUCCESS', date: { lt: new Date('2026-01-01') } },
        orderBy: { date: 'desc' },
    });
    console.log(`Latest SUCCESS Task in Backlog: ${latestSuccessInBacklog?.date.toISOString().split('T')[0]}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=find-first-record.js.map