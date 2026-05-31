"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const columns = await prisma.$queryRaw `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'appointments'
  `;
    console.log('Columns in appointments table:', columns);
    await prisma.$disconnect();
}
main().catch(console.error);
//# sourceMappingURL=inspect-db.js.map