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
const vttech_api_service_1 = require("./vttech-api.service");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function main() {
    console.log('🚀 Bootstrapping NestJS context for CRM data check with Branch 1...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    const testDates = [
        '2018-12-31',
        '2019-01-01',
        '2019-01-02'
    ];
    const types = [5, 2, 3];
    for (const date of testDates) {
        console.log(`\n--- Checking Branch 1 for date: ${date} ---`);
        for (const type of types) {
            try {
                const res = await vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', {
                    dateFrom: date,
                    dateTo: date,
                    branchID: '1',
                    type: type,
                    BeginID: 0,
                    BeginCustID: 0,
                    Limit: 10,
                });
                const items = Array.isArray(res) ? res : [];
                console.log(`Type ${type}: Found ${items.length} items.`);
                if (items.length > 0) {
                    console.log('Sample item:', {
                        CustID: items[0].CustID || items[0].ID,
                        CustName: items[0].CustName || items[0].FullName,
                        CreatedDate: items[0].CreatedDate || items[0].CreatedTime,
                    });
                }
            }
            catch (e) {
                console.error(`Error checking Type ${type} for date ${date}:`, e.message);
            }
        }
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=check-crm-data.js.map