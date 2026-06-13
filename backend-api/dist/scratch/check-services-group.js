"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const totalServices = await prisma.service.count();
    const servicesWithGroup = await prisma.service.count({
        where: { group_id: { not: null } }
    });
    console.log(`Total services: ${totalServices}`);
    console.log(`Services with group_id NOT null: ${servicesWithGroup}`);
    if (servicesWithGroup > 0) {
        const samples = await prisma.service.findMany({
            where: { group_id: { not: null } },
            take: 10,
        });
        console.log('Sample services with group mapping:');
        for (const s of samples) {
            const g = await prisma.serviceGroup.findUnique({
                where: { id: s.group_id }
            });
            console.log(`ID: ${s.id} | Name: ${s.name} | Group ID: ${s.group_id} | Group Name: ${g?.name || 'N/A'}`);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-services-group.js.map