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
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    console.log('Logging in and priming VTTech API...');
    await vttechApi.login();
    await vttechApi.getXsrfToken();
    console.log('VTTech API ready!');
    const branches = [1, 2, 3, 4, 6, 7, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26];
    const targetDate = '2026-06-16';
    const searchPhones = ['385040149', '908600322', '982251996'];
    console.log('\n--- Checking Appointments on 2026-06-16 across all branches ---');
    for (const bId of branches) {
        try {
            const res = await vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
                DateFrom: targetDate,
                BranchID: bId.toString(),
                AppID: '0',
                StatusID: '0',
                DoctorID: '0',
                TypeApp: '1',
            });
            const dataItems = Array.isArray(res) ? res : [];
            for (const a of dataItems) {
                const phone = a.Phone || a.Mobile || a.CustPhone || '';
                const match = searchPhones.find(sp => phone.includes(sp));
                if (match) {
                    console.log(`[APPT FOUND] Phone Match: ${phone} in Branch ID: ${bId}`);
                    console.log(`  Appointment ID: ${a.ID || a.ScheduleID}`);
                    console.log(`  Customer: ${a.CustName || a.CustomerName} (CustID: ${a.CustomerID})`);
                    console.log(`  Branch: ${a.BranchName || a.Branch}`);
                    console.log(`  Date: ${a.DateFrom || a.Date}`);
                    console.log(`  Status: ${a.StatusName} (ID: ${a.StatusID || a.State})`);
                    console.log(`  TypeName: ${a.TypeName}`);
                }
            }
        }
        catch (e) {
            console.error(`Error querying appointments for branch ${bId}: ${e.message}`);
        }
    }
    console.log('\n--- Checking Customers on 2026-06-16 (Type 1, 2, 3, 5) ---');
    for (const bId of branches) {
        for (const type of [1, 2, 3, 5]) {
            try {
                const res = await vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', {
                    dateFrom: targetDate,
                    dateTo: targetDate,
                    branchID: bId.toString(),
                    type: type,
                    BeginID: 0,
                    BeginCustID: 0,
                    Limit: 500,
                });
                const dataItems = Array.isArray(res) ? res : [];
                for (const c of dataItems) {
                    const phone = c.Phone || c.Mobile || '';
                    const match = searchPhones.find(sp => phone.includes(sp));
                    if (match) {
                        console.log(`[CUSTOMER FOUND] Phone Match: ${phone} in Branch ID: ${bId}, Type: ${type}`);
                        console.log(`  Customer ID: ${c.CustID || c.ID}`);
                        console.log(`  Code: ${c.CustCode || c.Cust_Code}`);
                        console.log(`  Name: ${c.CustName || c.FullName}`);
                        console.log(`  Branch: ${c.BranchID || bId}`);
                        console.log(`  Created: ${c.Created}`);
                    }
                }
            }
            catch (e) {
                console.error(`Error querying customers for branch ${bId}, type ${type}: ${e.message}`);
            }
        }
    }
    console.log('\n--- ALL DONE ---');
    await app.close();
}
bootstrap().catch(console.error);
//# sourceMappingURL=check_missing_data.js.map