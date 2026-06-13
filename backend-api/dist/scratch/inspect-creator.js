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
dotenv.config({ path: path.join(__dirname, '../.env') });
function decompress(data) {
    if (typeof data !== 'string')
        return data;
    try {
        if (data.trim().startsWith('{') || data.trim().startsWith('['))
            return JSON.parse(data);
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
    const baseURL = process.env.VTTECH_BASE_URL || 'https://tmtaza.vttechsolution.com';
    const username = process.env.VTTECH_USERNAME;
    const password = process.env.VTTECH_PASSWORD;
    const cookies = [];
    const instance = axios_1.default.create({
        baseURL,
        maxRedirects: 5,
        validateStatus: () => true,
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
        }
    });
    console.log('Logging in...');
    const loginRes = await instance.post('/api/Author/Login', {
        UserName: username, Password: password, PasswordEnCrypt: "", IP: "",
        TokenFCM: "", From: "", SSO: "", Lan: "vi", TokenSSO: ""
    });
    const token = loginRes.data.Session;
    const secretKey = 'ZdB9AsmlnaqopXnryYe8Uyj9YXaG0lZ09fNEljAifOESjErNDKj8TGtf0tGyKg2QpFsfOj5zQOUe+hiU1aN5mptaw7+sGwccT8pT0yFLgKE=';
    if (!token) {
        console.log('Login failed');
        return;
    }
    console.log('Login success');
    if (loginRes.headers['set-cookie']) {
        for (const c of loginRes.headers['set-cookie'])
            cookies.push(c.split(';')[0]);
    }
    console.log('Priming Session (Master_Top)...');
    const masterRes = await instance.get('/Master/Master_Top/', {
        headers: { Cookie: cookies.join('; ') + `; WebToken=${token}`, Accept: 'text/html' }
    });
    if (masterRes.headers['set-cookie']) {
        for (const c of masterRes.headers['set-cookie']) {
            const p = c.split(';')[0];
            const n = p.split('=')[0];
            const idx = cookies.findIndex(x => x.startsWith(n + '='));
            if (idx >= 0)
                cookies[idx] = p;
            else
                cookies.push(p);
        }
    }
    let xsrf = '';
    if (typeof masterRes.data === 'string') {
        const $ = cheerio.load(masterRes.data);
        xsrf = $('input[name="__RequestVerificationToken"]').val() || '';
    }
    const commonHeaders = {
        Cookie: cookies.join('; ') + `; WebToken=${token}`,
        Authorization: `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        'xsrf-token': xsrf,
        RequestVerificationToken: xsrf,
        secretkey: secretKey,
        'Referer': baseURL + '/Master/Master_Top/'
    };
    console.log('Getting Appointment Page...');
    const pageRes = await instance.get('/Desk/Appointment/AppointmentInDay_Desk_Branch/', {
        headers: { Cookie: cookies.join('; ') + `; WebToken=${token}`, Accept: 'text/html' }
    });
    if (pageRes.headers['set-cookie']) {
        for (const c of pageRes.headers['set-cookie']) {
            const p = c.split(';')[0];
            const n = p.split('=')[0];
            const idx = cookies.findIndex(x => x.startsWith(n + '='));
            if (idx >= 0)
                cookies[idx] = p;
            else
                cookies.push(p);
        }
    }
    let pageXsrf = xsrf;
    if (typeof pageRes.data === 'string') {
        const $c = cheerio.load(pageRes.data);
        const newXsrf = $c('input[name="__RequestVerificationToken"]').val();
        if (newXsrf) {
            pageXsrf = newXsrf;
        }
    }
    console.log('Fetching appointments...');
    const headers = {
        Cookie: cookies.join('; ') + `; WebToken=${token}`,
        Authorization: `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        'xsrf-token': pageXsrf,
        RequestVerificationToken: pageXsrf,
        secretkey: secretKey,
        Referer: baseURL + '/Desk/Appointment/AppointmentInDay_Desk_Branch/'
    };
    const d = '2026-06-03';
    const bId = '6';
    const formBody = new URLSearchParams();
    formBody.append('DateFrom', d);
    formBody.append('BranchID', bId);
    formBody.append('AppID', '0');
    formBody.append('StatusID', '0');
    formBody.append('DoctorID', '0');
    formBody.append('TypeApp', '1');
    formBody.append('__RequestVerificationToken', pageXsrf);
    const res = await instance.post('/Desk/Appointment/AppointmentInDay_Desk_Branch/?handler=LoadataAppointmentList', formBody, { headers });
    const data = decompress(res.data);
    let items = [];
    if (data) {
        if (Array.isArray(data))
            items = data;
        else if (data.Table)
            items = data.Table;
        else if (typeof data === 'object') {
            const keys = Object.keys(data);
            if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
                items = Object.values(data);
            }
            else {
                items = data.Table || [];
            }
        }
    }
    console.log(`Found ${items.length} appointments for Taza Đà Nẵng on 2026-06-03.`);
    const targetPhone = '0707519082';
    const match = items.find(item => String(item.Phone || item.Mobile || item.CustPhone).includes(targetPhone));
    if (match) {
        console.log('MATCHED APPOINTMENT RAW DATA:');
        console.log(JSON.stringify(match, null, 2));
    }
    else {
        console.log(`Appointment with phone ${targetPhone} not found in raw list.`);
        items.forEach(item => {
            console.log(`Name: ${item.CustName}, Phone: ${item.Phone || item.Mobile}, Date: ${item.DateFrom || item.Date}`);
        });
    }
}
test().catch(console.error);
//# sourceMappingURL=inspect-creator.js.map