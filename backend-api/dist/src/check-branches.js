"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const branches = await prisma.branch.findMany();
    console.log('--- BRANCHES ---');
    branches.forEach(b => {
        console.log(`ID: ${b.id} | Name: ${b.name}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-branches.js.map