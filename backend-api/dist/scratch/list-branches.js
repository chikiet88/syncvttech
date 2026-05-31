"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const branches = await prisma.branch.findMany({
        orderBy: { id: 'asc' },
    });
    console.log('All Branches in Database:', branches);
    await prisma.$disconnect();
}
main().catch(console.error);
//# sourceMappingURL=list-branches.js.map