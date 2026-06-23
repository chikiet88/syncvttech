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
const fs = __importStar(require("fs"));
dotenv.config();
async function main() {
    console.log('🚀 Bootstrapping NestJS context for CRM SettingListParam check...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    try {
        const res = await vttechApi.callHandler('/Setting/SettingListParam/', 'LoadData', {
            slug: 'nguon-khach-hang',
            limit: 100,
            offset: 0
        });
        console.log('API response keys:', res ? Object.keys(res) : null);
        if (res) {
            fs.writeFileSync('setting_list_param_res.json', JSON.stringify(res, null, 2));
            console.log('Saved to setting_list_param_res.json');
            if (Array.isArray(res)) {
                console.log(`Response is array of ${res.length} items.`);
                console.log('Sample item:', res[0]);
            }
            else if (res.Data || res.Table) {
                const items = res.Data || res.Table;
                console.log(`Response has Data/Table of ${items.length} items.`);
                console.log('Sample item:', items[0]);
            }
            else {
                console.log('Response content:', JSON.stringify(res).substring(0, 1000));
            }
        }
    }
    catch (e) {
        console.error('Error calling SettingListParam handler:', e.message);
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=check-setting-api.js.map