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
async function check() {
    const start = new Date('2026-06-01T00:00:00.000Z');
    const end = new Date('2026-06-01T23:59:59.999Z');
    const dailyCusts = await prisma.dailyCustomer.findMany({
        where: { date: { gte: start, lte: end } }
    });
    console.log(`Found ${dailyCusts.length} daily customer records for 2026-06-01.`);
    const customerIds = [...new Set(dailyCusts.map(c => c.customer_id))];
    console.log(`Unique customer IDs: ${customerIds.length}`);
    if (customerIds.length === 0) {
        await prisma.$disconnect();
        return;
    }
    const [anamnesis, care, complaint, plans, folders] = await Promise.all([
        prisma.customerAnamnesis.findMany({ where: { customer_id: { in: customerIds } } }),
        prisma.customerCareHistory.findMany({ where: { customer_id: { in: customerIds } } }),
        prisma.customerComplaint.findMany({ where: { customer_id: { in: customerIds } } }),
        prisma.customerTreatmentPlan.findMany({ where: { customer_id: { in: customerIds } } }),
        prisma.customerImageFolder.findMany({ where: { customer_id: { in: customerIds } } })
    ]);
    console.log(`Total details associated with these customers (any creation date):`);
    console.log(`- Tiền sử (Anamnesis): ${anamnesis.length}`);
    console.log(`- Tư vấn (Care History): ${care.length}`);
    console.log(`- Khiếu nại (Complaint): ${complaint.length}`);
    console.log(`- Chẩn đoán (Treatment Plans): ${plans.length}`);
    console.log(`- Thư mục ảnh (Image Folders): ${folders.length}`);
    if (anamnesis.length > 0) {
        console.log('\nSample Anamnesis:', anamnesis.slice(0, 3).map(a => ({ id: a.id, customer_id: a.customer_id, created_at: a.created_at })));
    }
    if (care.length > 0) {
        console.log('\nSample Care History:', care.slice(0, 3).map(c => ({ id: c.id, customer_id: c.customer_id, date: c.action_date })));
    }
    await prisma.$disconnect();
}
check();
//# sourceMappingURL=check-details-for-yesterday-customers.js.map