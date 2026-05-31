"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const dbs = await prisma.$queryRaw `
    SELECT datname FROM pg_database WHERE datistemplate = false
  `;
    console.log('Databases:', dbs);
    await prisma.$disconnect();
}
main().catch(console.error);
//# sourceMappingURL=list-dbs.js.map