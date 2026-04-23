"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const dateStr = '2026-04-22';
    const start = new Date(dateStr);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);
    const transactions = await prisma.revenueTransaction.findMany({
        where: { date: { gte: start, lte: end } },
        take: 5
    });
    console.table(transactions.map(t => ({
        id: t.id,
        branch: t.branch_id,
        synced: t.synced_at,
        hash: t.last_hash
    })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-hashes.js.map