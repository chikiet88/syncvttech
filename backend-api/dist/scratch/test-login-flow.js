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
const app_module_1 = require("../src/app.module");
const vttech_api_service_1 = require("../src/vttech-api.service");
const cheerio = __importStar(require("cheerio"));
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const vttechApi = app.get(vttech_api_service_1.VttechApiService);
    const s = vttechApi.sessions[0];
    console.log(`Diagnosing login for user: ${s.username}`);
    const axiosInstance = vttechApi.axiosInstance;
    const baseUrl = vttechApi.baseUrl;
    async function followRedirects(method, url, config) {
        let currentUrl = url;
        let currentMethod = method;
        let hops = 0;
        while (hops <= 5) {
            console.log(`[Hop ${hops}] Sending ${currentMethod.toUpperCase()} to ${currentUrl}...`);
            const start = Date.now();
            try {
                const resp = currentMethod === 'get'
                    ? await axiosInstance.get(currentUrl, { ...config, session: s })
                    : await axiosInstance.post(currentUrl, config?.data, { ...config, session: s });
                console.log(`[Hop ${hops}] Response status: ${resp.status} in ${Date.now() - start}ms`);
                if (resp.headers['set-cookie']) {
                    console.log(`[Hop ${hops}] Cookies set:`, resp.headers['set-cookie']);
                }
                if (resp.status >= 300 && resp.status < 400) {
                    const location = resp.headers['location'];
                    console.log(`[Hop ${hops}] Redirect location: ${location}`);
                    if (location === currentUrl || (location && location.endsWith(currentUrl))) {
                        console.log(`[Hop ${hops}] Redirect loop detected, stopping.`);
                        return resp;
                    }
                    currentUrl = location || '';
                    currentMethod = 'get';
                    hops++;
                }
                else {
                    return resp;
                }
            }
            catch (err) {
                console.error(`[Hop ${hops}] Error: ${err.message} in ${Date.now() - start}ms`);
                throw err;
            }
        }
        throw new Error('Too many redirects');
    }
    try {
        console.log('--- Step 1: followRedirects to /Login/Login ---');
        const loginPageRes = await followRedirects('get', '/Login/Login?ver=' + Date.now(), {
            headers: { 'Accept': 'text/html' },
            timeout: 12000
        });
        console.log('--- Step 2: Extracting tokens ---');
        let secretKey = '';
        let xsrfToken = '';
        if (typeof loginPageRes.data === 'string') {
            const $ = cheerio.load(loginPageRes.data);
            const scriptContent = $('script').map((_, el) => $(el).html()).get().join('\n');
            const skMatch = scriptContent.match(/sys_SecretKey\s*=\s*['"]([^'"]+)['"]/i) ||
                scriptContent.match(/SecretKey\s*[:=]\s*['"]([^'"]+)['"]/i);
            if (skMatch && skMatch[1]) {
                secretKey = skMatch[1];
                console.log(`Extracted sys_SecretKey: ${secretKey}`);
            }
            const formToken = $('input[name="__RequestVerificationToken"]').val();
            if (formToken) {
                xsrfToken = formToken;
                console.log(`Extracted __RequestVerificationToken: ${xsrfToken}`);
            }
        }
        console.log('--- Step 3: API Login ---');
        const loginPayload = {
            UserName: s.username, Password: s.password, PasswordEnCrypt: "",
            IP: "", TokenFCM: "", From: "", SSO: "", Lan: "vi", TokenSSO: ""
        };
        console.log('Sending POST to /api/Author/Login...');
        const startPost = Date.now();
        const loginRes = await axiosInstance.post('/api/Author/Login', loginPayload, {
            headers: { 'Content-Type': 'application/json; charset=UTF-8', 'Referer': baseUrl + '/Login/Login/' },
            session: s,
            timeout: 12000
        });
        console.log(`POST /api/Author/Login status: ${loginRes.status} in ${Date.now() - startPost}ms`);
        console.log('POST Response data:', loginRes.data);
    }
    catch (err) {
        console.error('Test failed:', err.stack);
    }
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=test-login-flow.js.map