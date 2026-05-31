"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const tables = await prisma.$queryRaw `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;
    console.log('Tables:', tables.map(t => t.table_name));
    await prisma.$disconnect();
}
main().catch(console.error);
//# sourceMappingURL=list-tables.js.map