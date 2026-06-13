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
    const start = new Date('2026-06-01T00:00:00.000Z');
    const end = new Date('2026-06-01T23:59:59.999Z');
    console.log(`Checking counts for date range: ${start.toISOString()} to ${end.toISOString()}`);
    const [anamnesisCount, careCount, complaintCount, treatmentPlanCount, imageFolderCount] = await Promise.all([
        prisma.customerAnamnesis.count({
            where: {
                created_at: { gte: start, lte: end }
            }
        }),
        prisma.customerCareHistory.count({
            where: {
                action_date: { gte: start, lte: end }
            }
        }),
        prisma.customerComplaint.count({
            where: {
                created_at: { gte: start, lte: end }
            }
        }),
        prisma.customerTreatmentPlan.count({
            where: {
                created_at: { gte: start, lte: end }
            }
        }),
        prisma.customerImageFolder.count({
            where: {
                created_at: { gte: start, lte: end }
            }
        })
    ]);
    console.log(`\nExact counts for details created on 2026-06-01:`);
    console.log(`- Tiền sử (Anamnesis): ${anamnesisCount}`);
    console.log(`- Tư vấn (Care History): ${careCount}`);
    console.log(`- Khiếu nại (Complaint): ${complaintCount}`);
    console.log(`- Chẩn đoán (Treatment Plans): ${treatmentPlanCount}`);
    console.log(`- Thư mục ảnh (Image Folders): ${imageFolderCount}`);
    const [totalCare, totalAnamnesis, totalComplaint, totalTreatmentPlans, totalImageFolders] = await Promise.all([
        prisma.customerCareHistory.count(),
        prisma.customerAnamnesis.count(),
        prisma.customerComplaint.count(),
        prisma.customerTreatmentPlan.count(),
        prisma.customerImageFolder.count(),
    ]);
    console.log(`\nTotal counts overall in database:`);
    console.log(`- Tiền sử (Anamnesis): ${totalAnamnesis}`);
    console.log(`- Tư vấn (Care History): ${totalCare}`);
    console.log(`- Khiếu nại (Complaint): ${totalComplaint}`);
    console.log(`- Chẩn đoán (Treatment Plans): ${totalTreatmentPlans}`);
    console.log(`- Thư mục ảnh (Image Folders): ${totalImageFolders}`);
    await prisma.$disconnect();
}
main().catch(console.error);
//# sourceMappingURL=count-details.js.map