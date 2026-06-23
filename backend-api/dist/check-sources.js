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
    console.log('🚀 Bootstrapping NestJS context for CRM sources check...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    try {
        const result = await vttechApi.callApi('/api/Home/SessionData', {});
        if (result && result.Table10) {
            console.log(`Found ${result.Table10.length} customer sources in SessionData.`);
            fs.writeFileSync('sources_session_data.json', JSON.stringify(result.Table10, null, 2));
            console.log('Saved to sources_session_data.json');
            const matches = result.Table10.filter((s) => s.Name.includes('TELE') || s.Name.includes('FB') || s.Name.includes('SOL') || s.ID === '239' || s.ID === '240' || s.ID === '241' || s.ID === 239 || s.ID === 240 || s.ID === 241);
            console.log('Matches:', matches);
        }
        else {
            console.log('No Table10 in SessionData.', Object.keys(result));
        }
    }
    catch (e) {
        console.error('Error fetching SessionData:', e.message);
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=check-sources.js.map