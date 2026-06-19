"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const sync_service_1 = require("./sync.service");
const prisma_service_1 = require("./prisma.service");
const vttech_api_service_1 = require("./vttech-api.service");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function bootstrap() {
    console.log('🚀 Bootstrapping NestJS context for manual sync on 2026-06-16...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const syncService = app.get(sync_service_1.SyncService);
    const prisma = app.get(prisma_service_1.PrismaService);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    const targetDateStr = '2026-06-16';
    const targetDate = new Date(targetDateStr);
    const pendingTasks = await prisma.syncTask.findMany({
        where: {
            date: targetDate,
            status: 'PENDING'
        }
    });
    pendingTasks.sort((a, b) => {
        if (a.branch_id === 6)
            return -1;
        if (b.branch_id === 6)
            return 1;
        return 0;
    });
    console.log(`Found ${pendingTasks.length} pending tasks to sync:`);
    pendingTasks.forEach(t => console.log(`- Task ${t.id} for Branch ${t.branch_name} (ID: ${t.branch_id})`));
    for (const task of pendingTasks) {
        console.log(`\n=== SYNCING BRANCH: ${task.branch_name} (ID: ${task.branch_id}) ===`);
        await prisma.syncTask.update({
            where: { id: task.id },
            data: { status: 'PROCESSING', updated_at: new Date() }
        });
        try {
            console.log(`Discovering customers (Types 5, 2, 3) and appointments...`);
            const typesToSync = [5, 2, 3];
            const allFoundCustomerIds = new Set();
            let customersFound = 0;
            for (const type of typesToSync) {
                const ids = await syncService.syncCustomers(targetDateStr, targetDateStr, type, task.branch_id);
                ids.forEach((id) => allFoundCustomerIds.add(id));
                customersFound += ids.length;
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            const appointmentIds = await syncService.syncAppointments(targetDateStr, targetDateStr, task.branch_id);
            appointmentIds.forEach((id) => allFoundCustomerIds.add(id));
            const appointmentsCount = appointmentIds.length;
            const totalRecords = customersFound + appointmentsCount;
            console.log(`Discovered: ${allFoundCustomerIds.size} customers, ${appointmentsCount} appointments.`);
            let daySales = 0;
            let dayRevenue = 0;
            try {
                const res = await vttechApi.getRevenueByBranch(targetDateStr, targetDateStr, task.branch_id);
                const revItems = Array.isArray(res) ? res : [];
                for (let idx = 0; idx < revItems.length; idx++) {
                    const item = revItems[idx];
                    const mapped = syncService.mapRevenueItem(item, task.branch_id, targetDateStr);
                    daySales += mapped.amount;
                    dayRevenue += mapped.paid;
                    const baseId = parseInt(item.ID || item.id || item.PaymentID || item.OrderID || item.TabID) || 0;
                    const currentHash = syncService.generateHash(item);
                    let tId = undefined;
                    if (baseId > 0 && baseId < 2000000) {
                        tId = baseId * 100 + (idx % 100);
                    }
                    if (tId) {
                        await prisma.revenueTransaction.upsert({
                            where: { id: tId },
                            update: { ...mapped, last_hash: currentHash },
                            create: { ...mapped, id: tId, last_hash: currentHash }
                        });
                    }
                    else {
                        const existing = await prisma.revenueTransaction.findFirst({
                            where: { branch_id: task.branch_id, last_hash: currentHash }
                        });
                        if (!existing) {
                            await prisma.revenueTransaction.create({
                                data: { ...mapped, last_hash: currentHash, created_at: new Date() }
                            });
                        }
                    }
                }
            }
            catch (e) {
                console.error(`Error syncing revenue for branch ${task.branch_id}: ${e.message}`);
            }
            if (allFoundCustomerIds.size > 0) {
                console.log(`Syncing details for ${allFoundCustomerIds.size} customers synchronously...`);
                let count = 0;
                for (const cId of allFoundCustomerIds) {
                    count++;
                    console.log(`[${count}/${allFoundCustomerIds.size}] Syncing details for Customer ID: ${cId}...`);
                    try {
                        await syncService.processQueuedCustomerDetail(cId, task.id);
                    }
                    catch (e) {
                        console.error(`Error syncing details for customer ${cId}: ${e.message}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            await prisma.syncTask.update({
                where: { id: task.id },
                data: {
                    status: 'SUCCESS',
                    records_count: totalRecords,
                    customers_count: allFoundCustomerIds.size,
                    appointments_count: appointmentsCount,
                    sales_total: daySales,
                    revenue_total: dayRevenue,
                    total_details: allFoundCustomerIds.size,
                    completed_details: allFoundCustomerIds.size,
                    error_message: null,
                    updated_at: new Date(),
                }
            });
            console.log(`✅ Branch ${task.branch_name} synced successfully!`);
        }
        catch (err) {
            console.error(`❌ Failed to sync branch ${task.branch_name}: ${err.message}`);
            await prisma.syncTask.update({
                where: { id: task.id },
                data: {
                    status: 'PENDING',
                    error_message: `Manual sync failed: ${err.message}`,
                    updated_at: new Date()
                }
            });
        }
    }
    console.log('\n🚀 ALL PENDING TASKS SYNCED SUCCESSFULLY!');
    await app.close();
}
bootstrap().catch(console.error);
//# sourceMappingURL=sync_manual_june16.js.map