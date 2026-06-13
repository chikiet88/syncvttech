"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const app = await prisma.appointment.findFirst({
        where: {
            service_name: { contains: 'tư vấn', mode: 'insensitive' }
        }
    });
    console.log('Sample appointment with service_name containing "tư vấn":', app);
    const countZero = await prisma.appointment.count({
        where: { service_id: 0 }
    });
    console.log('Appointments with service_id = 0:', countZero);
    const countNull = await prisma.appointment.count({
        where: { service_id: null }
    });
    console.log('Appointments with service_id = null:', countNull);
    const distinctServices = await prisma.appointment.findMany({
        select: { service_id: true, service_name: true },
        distinct: ['service_id', 'service_name'],
        take: 20
    });
    console.log('Distinct service_id and service_name pairs in appointments:', distinctServices);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-single-app.js.map