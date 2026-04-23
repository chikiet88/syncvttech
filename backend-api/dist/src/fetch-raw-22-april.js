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
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const vttech_api_service_1 = require("./vttech-api.service");
const config_1 = require("@nestjs/config");
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
    if (data && data.Table) {
        console.log(`Found ${data.Table.length} records.`);
        console.table(data.Table.map((item) => ({
            ID: item.ID || item.id,
            Cust: item.CustomerName,
            Amount: item.PriceDiscounted || item.Amount,
            Paid: item.PaidAmount || item.Paid,
            Type: item.TypePayment || item.Type,
            PaymentID: item.PaymentID,
            OrderID: item.OrderID
        })));
        console.log('\nFetching raw payment detail...');
        const payments = await api.getPaymentByBranch(dateStr, dateStr, branchId);
        if (payments && payments.Table) {
            console.log(`Found ${payments.Table.length} payment records.`);
            console.table(payments.Table.map((item) => ({
                ID: item.ID,
                Cust: item.CustomerName,
                Amount: item.Amount,
                Deposit: item.PaymentDeposit,
                Type: item.TypePayment,
                Created: item.Created
            })));
        }
    }
    else {
        console.log('No data returned or error.');
        console.log(data);
    }
}
main().catch(console.error);
//# sourceMappingURL=fetch-raw-22-april.js.map