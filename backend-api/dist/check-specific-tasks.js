"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const tasks = await prisma.syncTask.findMany({
        where: {
            id: {
                gte: 204690,
                lte: 204700,
            }
        },
        orderBy: { id: 'asc' },
    });
    console.log('--- SYNC TASKS 204690 to 204700 ---');
    tasks.forEach(t => {
        console.log(`ID: ${t.id} | Date: ${t.date.toISOString().split('T')[0]} | Branch: ${t.branch_id} | Status: ${t.status} | Updated: ${t.updated_at}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-specific-tasks.js.map