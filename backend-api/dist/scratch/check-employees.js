"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const empCount = await prisma.employee.count();
    const userCount = await prisma.user.count();
    console.log(`Employees in DB: ${empCount}`);
    console.log(`Users in DB: ${userCount}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-employees.js.map