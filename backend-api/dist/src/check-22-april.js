"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const dateStr = '2026-04-22';
    const start = new Date(dateStr);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);
    console.log(`Checking data for ${dateStr}...`);
    const branches = await prisma.branch.findMany({
        where: { is_active: 1 },
        orderBy: { id: 'asc' }
    });
    const results = [];
    for (const branch of branches) {
        const [customersCountResult, revenueData] = await Promise.all([
            prisma.$queryRaw `
        SELECT count(DISTINCT customer_id) as "count" 
        FROM (
          SELECT customer_id FROM daily_customers 
          WHERE branch_id = ${branch.id} 
            AND date >= ${start} 
            AND date <= ${end}
          UNION
          SELECT customer_id FROM appointments 
          WHERE branch_id = ${branch.id} 
            AND appointment_date >= ${start} 
            AND appointment_date <= ${end}
          UNION
          SELECT customer_id FROM treatments 
          WHERE branch_id = ${branch.id} 
            AND treatment_date >= ${start} 
            AND treatment_date <= ${end}
          UNION
          SELECT customer_id FROM revenue_transactions 
          WHERE branch_id = ${branch.id} 
            AND date >= ${start} 
            AND date <= ${end}
        ) AS active_customers
      `,
            prisma.revenueTransaction.aggregate({
                where: { branch_id: branch.id, date: { gte: start, lte: end } },
                _sum: { amount: true, paid: true }
            })
        ]);
        const customerCount = Number(customersCountResult[0]?.count || 0);
        if (customerCount > 0 || (revenueData._sum?.amount || 0) > 0 || (revenueData._sum?.paid || 0) > 0) {
            results.push({
                id: branch.id,
                name: branch.name,
                customers: customerCount,
                sales: revenueData._sum?.amount || 0,
                revenue: revenueData._sum?.paid || 0
            });
        }
    }
    console.table(results);
    const totalCustomers = results.reduce((sum, r) => sum + r.customers, 0);
    const totalSales = results.reduce((sum, r) => sum + r.sales, 0);
    const totalRevenue = results.reduce((sum, r) => sum + r.revenue, 0);
    console.log('--- DB TOTALS ---');
    console.log(`Customers: ${totalCustomers}`);
    console.log(`Sales: ${totalSales.toLocaleString()}`);
    console.log(`Revenue: ${totalRevenue.toLocaleString()}`);
    const tasks = await prisma.syncTask.findMany({
        where: { date: start }
    });
    console.log('\n--- SYNC TASKS ---');
    console.table(tasks.map(t => ({
        branch: t.branch_name,
        type: t.type,
        status: t.status,
        records: t.records_count,
        error: t.error_message
    })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-22-april.js.map