"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const history = await prisma.customerStatusHistory.findMany({
        where: {
            OR: [
                { content: { contains: 'phễu', mode: 'insensitive' } },
                { master_status_name: { contains: 'phễu', mode: 'insensitive' } },
                { detail_status_name: { contains: 'phễu', mode: 'insensitive' } }
            ]
        },
        take: 10
    });
    console.log(`Found ${history.length} status history records containing 'phễu'`);
    history.forEach(h => {
        console.log(`CustomerID: ${h.customer_id} | Master: ${h.master_status_name} | Detail: ${h.detail_status_name} | Content: ${h.content}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-service-groups.js.map