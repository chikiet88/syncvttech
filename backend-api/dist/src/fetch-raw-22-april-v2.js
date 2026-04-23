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
const vttech_api_service_1 = require("./vttech-api.service");
const config_1 = require("@nestjs/config");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function main() {
    const configService = new config_1.ConfigService({
        VTTECH_BASE_URL: 'https://tmtaza.vttechsolution.com',
        VTTECH_ACCOUNTS: process.env.VTTECH_ACCOUNTS
    });
    const api = new vttech_api_service_1.VttechApiService(configService);
    const dateStr = '2026-04-22';
    const branchId = 6;
    console.log(`Fetching raw revenue data for Branch ${branchId} on ${dateStr}...`);
    const data = await api.getRevenueByBranch(dateStr, dateStr, branchId);
    if (data && data.Table && data.Table.length > 0) {
        console.log('First Item Raw:', JSON.stringify(data.Table[0], null, 2));
        console.log('Total Items:', data.Table.length);
        let totalSales = 0;
        let totalRevenue = 0;
        data.Table.forEach((item) => {
            const sales = item.Amount || item.AmountPaid || item.PriceDiscounted || 0;
            const paid = item.Paid || item.PaidAmount || 0;
            totalSales += sales;
            totalRevenue += paid;
        });
        console.log(`Total Sales Calculated: ${totalSales}`);
        console.log(`Total Revenue Calculated: ${totalRevenue}`);
    }
    else {
        console.log('No data or non-JSON response.');
        console.log('Data type:', typeof data);
        if (typeof data === 'string')
            console.log('Snippet:', data.slice(0, 500));
    }
}
main().catch(console.error);
//# sourceMappingURL=fetch-raw-22-april-v2.js.map