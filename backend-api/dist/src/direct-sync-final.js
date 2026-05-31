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
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const syncService = app.get(sync_service_1.SyncService);
    const prisma = app.get(prisma_service_1.PrismaService);
    const dateStr = '2026-04-22';
    console.log(`🚀 Starting DIRECT re-sync for ${dateStr} with Type 2 & 3 support...`);
    const branches = await prisma.branch.findMany({ where: { is_active: 1 } });
    for (const branch of branches) {
        console.log(`\n--- Syncing Branch ${branch.id}: ${branch.name} ---`);
        try {
            await syncService.processQueuedRevenueDay(dateStr, branch.id);
            console.log(`✅ Revenue synced for ${branch.name}`);
        }
        catch (e) {
            console.error(`❌ Error syncing branch ${branch.name}: ${e.message}`);
        }
    }
    console.log('\n🚀 ALL DONE!');
    await app.close();
}
bootstrap().catch(console.error);
//# sourceMappingURL=direct-sync-final.js.map