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
const zlib = __importStar(require("zlib"));
const cheerio = __importStar(require("cheerio"));
dotenv.config({ path: path.join(__dirname, '.env') });
function decompress(data) {
    if (!data || typeof data !== 'string')
        return data;
    try {
        const clean = data.replace(/^"|"$/g, '');
        const buf = Buffer.from(clean, 'base64');
        try {
            return JSON.parse(zlib.gunzipSync(buf).toString('utf-8'));
        }
        catch {
            try {
                return JSON.parse(zlib.inflateSync(buf).toString('utf-8'));
            }
            catch {
                return JSON.parse(zlib.inflateRawSync(buf).toString('utf-8'));
            }
        }
    }
    catch {
        try {
            return JSON.parse(data);
        }
        catch {
            return data;
        }
    }
}
async function test() {
    const base = process.env.VTTECH_BASE_URL;
    const cookies = [];
    let xsrfToken = null;
    const REAL_SECRET_KEY = 'ZdB9AsmlnaqopXnryYe8Uyj9YXaG0lZ09fNEljAifOESjErNDKj8TGtf0tGyKg2QpFsfOj5zQOUe+hiU1aN5mptaw7+sGwccT8pT0yFLgKE=';
    function upd(h) { if (h['set-cookie'])
        for (const c of h['set-cookie']) {
            const p = c.split(';')[0];
            const n = p.split('=')[0];
            const i = cookies.findIndex(x => x.startsWith(n + '='));
            if (i >= 0)
                cookies[i] = p;
            else
                cookies.push(p);
        } }
    const lp = await axios_1.default.get(base + '/Login/Login', { maxRedirects: 0, validateStatus: () => true });
    upd(lp.headers);
    if (typeof lp.data === 'string') {
        const $ = cheerio.load(lp.data);
        xsrfToken = $('input[name="__RequestVerificationToken"]').val() || null;
    }
    cookies.push('.AspNetCore.Culture=c%3Den-US%7Cuic%3Dvi');
    cookies.push('VTTECH_Menu_SideBarIsHide=false');
    const lr = await axios_1.default.post(base + '/api/Author/Login', {
        UserName: process.env.VTTECH_USERNAME, Password: process.env.VTTECH_PASSWORD,
        PasswordEnCrypt: '', IP: '', TokenFCM: '', From: '', SSO: '', Lan: 'vi', TokenSSO: ''
    }, { headers: { Cookie: cookies.join('; '), 'Content-Type': 'application/json; charset=UTF-8' }, validateStatus: () => true });
    upd(lr.headers);
    const token = lr.data.Session;
    cookies.push('WebToken=' + token);
    console.log('Login:', token ? '✅' : '❌');
    const dr = await axios_1.default.get(base + '/appointment/appointmentinday/', {
        headers: { Cookie: cookies.join('; '), Accept: 'text/html' }, maxRedirects: 5, validateStatus: () => true
    });
    upd(dr.headers);
    console.log('Dashboard:', dr.status, '(' + (typeof dr.data === 'string' ? dr.data.length : 0) + ' bytes)');
    const rp = await axios_1.default.get(base + '/report/reportgeneral/', {
        headers: { Cookie: cookies.join('; '), Accept: 'text/html' }, maxRedirects: 5, validateStatus: () => true
    });
    upd(rp.headers);
    if (typeof rp.data === 'string') {
        const $ = cheerio.load(rp.data);
        const rt = $('input[name="__RequestVerificationToken"]').val();
        if (rt)
            xsrfToken = rt;
    }
    console.log('XSRF:', xsrfToken ? '✅' : '❌');
    console.log('Cookies:', cookies.map(c => c.split('=')[0]).join(', '));
    console.log('SecretKey: REAL (from browser)');
    console.log('\n=== TEST với REAL SecretKey ===');
    const handlerUrl = '/Report/Revenue/Branch/AllBranchGrid/?handler=Loadata';
    const body = new URLSearchParams({ dateFrom: '03-04-2026', dateTo: '03-04-2026', branchID: '7' });
    const hr = await axios_1.default.post(base + handlerUrl, body.toString(), {
        headers: {
            Cookie: cookies.join('; '),
            'xsrf-token': xsrfToken || '',
            'secretkey': REAL_SECRET_KEY,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': base + '/report/reportgeneral/?page=17',
            'Accept': '*/*',
            'Origin': base,
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
        },
        maxRedirects: 0, validateStatus: () => true
    });
    console.log('Handler Status:', hr.status);
    if (hr.status === 302)
        console.log('Redirect:', hr.headers['location']);
    if (hr.status === 200) {
        const d = decompress(hr.data);
        if (Array.isArray(d))
            console.log('✅✅✅ GOT', d.length, 'records!');
        else if (d?.Table)
            console.log('✅✅✅ GOT Table:', d.Table.length, 'records!');
        else
            console.log('Data type:', typeof d, JSON.stringify(d).slice(0, 100));
    }
    if (hr.status === 400)
        console.log('Body:', String(hr.data).slice(0, 200));
    console.log('\n=== TEST với OLD SecretKey (fallback) ===');
    const OLD_KEY = 'vvjeUfMxJcm2aB0fl2ySxsiqGj5X5X3SY3Dl6Qj2te0SouYCtVRKC7qcp/MiP16aD5iQLEfgAsDk/ERxed+eUbi8eaY7/mraxUcfGqobMu4=';
    const hr2 = await axios_1.default.post(base + handlerUrl, body.toString(), {
        headers: {
            Cookie: cookies.join('; '),
            'xsrf-token': xsrfToken || '',
            'secretkey': OLD_KEY,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': base + '/report/reportgeneral/?page=17',
            'Origin': base,
        },
        maxRedirects: 0, validateStatus: () => true
    });
    console.log('Handler Status (old key):', hr2.status);
    if (hr2.status === 302)
        console.log('Redirect:', hr2.headers['location']);
}
test().catch(e => console.error(e.message));
//# sourceMappingURL=debug-api.js.map