"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:postgres@localhost:12003/db_tazagroup_vttech_sync"
        }
    }
});
async function main() {
    const count = await prisma.treatment.count();
    console.log(`Total records in treatment table: ${count}`);
    const samples = await prisma.treatment.findMany({
        where: {
            treatment_date: { not: null }
        },
        take: 10,
        orderBy: { treatment_date: 'desc' },
        select: {
            id: true,
            customer_id: true,
            treatment_date: true,
            note: true
        }
    });
    console.log('\nSample treatments:');
    for (const s of samples) {
        console.log(`- ID: ${s.id}, CustomerID: ${s.customer_id}, Date: ${s.treatment_date ? s.treatment_date.toISOString() : 'NULL'}, Note: ${s.note}`);
    }
    await prisma.$disconnect();
}
main().catch(console.error);
//# sourceMappingURL=check-treatments-db.js.map