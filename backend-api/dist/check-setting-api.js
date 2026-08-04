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
    console.log('🚀 Bootstrapping NestJS context for TicketSourceList with CHIKIET...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    try {
        const session = {
            username: 'CHIKIET',
            password: '@hikiet88',
            token: null, secretKey: null, cookies: [], xsrfToken: null,
            lastUsedAt: 0, errorCount: 0, lastErrorAt: 0, loginByUsernamePromise: null, lock: null
        };
        console.log('🔑 Logging in CHIKIET...');
        const loggedIn = await vttechApi.login(session, true);
        console.log('Login result:', loggedIn);
        console.log('📡 Calling /Marketing/TicketSourceList/?handler=LoadData...');
        const res = await vttechApi.callHandler('/Marketing/TicketSourceList/', 'LoadData', {}, 'CHIKIET');
        console.log('API response keys:', res ? Object.keys(res) : null);
        if (res) {
            const decomp = vttechApi.decompress(res);
            console.log('Decompressed keys:', decomp ? Object.keys(decomp) : null);
            if (decomp && (decomp.Table || decomp.Table1)) {
                fs.writeFileSync('scratch/sources_chikiet.json', JSON.stringify(decomp, null, 2));
                console.log(`✅ SUCCESS! Table: ${decomp.Table?.length || 0} items, Table1: ${decomp.Table1?.length || 0} items.`);
            }
            else {
                console.log('Raw res:', JSON.stringify(res).substring(0, 500));
            }
        }
        else {
            console.log('Response was null');
        }
    }
    catch (e) {
        console.error('Error calling TicketSourceList handler:', e.message);
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=check-setting-api.js.map