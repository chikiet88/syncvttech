"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const serviceZero = await prisma.service.findUnique({
        where: { id: 0 }
    });
    console.log('Service ID 0 in DB:', serviceZero);
    const appNotZero = await prisma.appointment.findFirst({
        where: {
            NOT: [
                { service_id: 0 },
                { service_id: null }
            ]
        }
    });
    console.log('Sample appointment with service_id NOT 0:', appNotZero);
    const countNotZero = await prisma.appointment.count({
        where: {
            NOT: [
                { service_id: 0 },
                { service_id: null }
            ]
        }
    });
    console.log('Appointments count with service_id NOT 0:', countNotZero);
    const totalApps = await prisma.appointment.count();
    console.log('Total appointments:', totalApps);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=find-service-zero.js.map