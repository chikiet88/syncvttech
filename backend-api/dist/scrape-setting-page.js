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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const vttech_api_service_1 = require("./vttech-api.service");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
dotenv.config();
async function main() {
    console.log('🚀 Bootstrapping NestJS context for CRM Setting Page Scraping...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    const username = 'CHIKIET';
    const password = '@hikiet88';
    const session = {
        username,
        password,
        token: null,
        secretKey: null,
        cookies: [],
        xsrfToken: null,
        lastUsedAt: 0,
        errorCount: 0,
        lastErrorAt: 0,
        loginByUsernamePromise: null,
        lock: null
    };
    try {
        console.log(`🔑 Attempting login for ${username}...`);
        const loggedIn = await vttechApi.login(session, true);
        if (!loggedIn) {
            console.error('❌ Login failed!');
            await app.close();
            return;
        }
        console.log('✅ Login succeeded! Cookies:', session.cookies);
        await vttechApi.getXsrfToken(session, '/setting/settinglistparam/?slug=nguon-khach-hang', true);
        const pageUrl = `${vttechApi['baseUrl']}/setting/settinglistparam/?slug=nguon-khach-hang`;
        console.log(`📡 Fetching page: ${pageUrl}`);
        const ck = [...session.cookies];
        if (session.token) {
            ck.push(`WebToken=${session.token}`);
            ck.push(`Token=${session.token}`);
            ck.push(`token=${session.token}`);
        }
        const headers = {
            'Cookie': ck.join('; '),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Referer': vttechApi['baseUrl'] + '/',
        };
        if (session.secretKey)
            headers['secretkey'] = session.secretKey;
        if (session.xsrfToken)
            headers['RequestVerificationToken'] = session.xsrfToken;
        const response = await axios_1.default.get(pageUrl, {
            headers,
            validateStatus: () => true
        });
        console.log(`Page status: ${response.status}`);
        if (response.status === 200) {
            fs.writeFileSync('setting_page.html', response.data);
            console.log('Saved setting page HTML to setting_page.html');
            const $ = cheerio.load(response.data);
            console.log('--- Scripts found containing keywords ---');
            $('script').each((i, el) => {
                const text = $(el).html() || '';
                if (text.includes('Save') || text.includes('Detail') || text.includes('insert') || text.includes('update') || text.includes('Param')) {
                    console.log(`Script ${i}: contains relevant keywords (length ${text.length})`);
                }
            });
        }
        else {
            console.error('❌ Failed to fetch page. Body:', response.data.substring(0, 500));
        }
    }
    catch (e) {
        console.error('Error during scraping:', e.message);
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=scrape-setting-page.js.map