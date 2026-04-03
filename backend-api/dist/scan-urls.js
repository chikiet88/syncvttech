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
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.join(__dirname, '.env') });
async function scan() {
    const base = process.env.VTTECH_BASE_URL;
    const r1 = await axios_1.default.post(base + '/api/Author/Login', {
        UserName: process.env.VTTECH_USERNAME, Password: process.env.VTTECH_PASSWORD,
        PasswordEnCrypt: '', IP: '', TokenFCM: '', From: '', SSO: '', Lan: 'vi', TokenSSO: ''
    }, { validateStatus: () => true });
    const token = r1.data?.Session;
    if (!token) {
        console.log('LOGIN FAIL');
        return;
    }
    const cookies = [];
    if (r1.headers['set-cookie'])
        for (const c of r1.headers['set-cookie'])
            cookies.push(c.split(';')[0]);
    cookies.push(`WebToken=${token}`);
    const ck = cookies.join('; ');
    const urls = ['/', '/Index/', '/index.html', '/Master/Master_Top/', '/Home/', '/Dashboard/',
        '/Report/ReportGeneral/', '/Home/Index/', '/Master_Top/', '/home/index'];
    for (const url of urls) {
        try {
            const r = await axios_1.default.get(base + url, {
                headers: { Cookie: ck, Accept: 'text/html' },
                maxRedirects: 0, validateStatus: () => true, timeout: 5000
            });
            const loc = r.status >= 300 && r.status < 400 ? ` -> ${r.headers['location']}` : '';
            const size = typeof r.data === 'string' ? ` (${r.data.length} bytes)` : '';
            console.log(`${url}: ${r.status}${loc}${size}`);
        }
        catch (e) {
            console.log(`${url}: ERROR ${e.message}`);
        }
    }
}
scan().catch(e => console.error(e.message));
//# sourceMappingURL=scan-urls.js.map