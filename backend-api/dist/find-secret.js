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
async function go() {
    const base = process.env.VTTECH_BASE_URL;
    const cookies = [];
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
    const lr = await axios_1.default.post(base + '/api/Author/Login', { UserName: process.env.VTTECH_USERNAME, Password: process.env.VTTECH_PASSWORD, PasswordEnCrypt: '', IP: '', TokenFCM: '', From: '', SSO: '', Lan: 'vi', TokenSSO: '' }, { headers: { Cookie: cookies.join('; ') }, validateStatus: () => true });
    upd(lr.headers);
    const token = lr.data.Session;
    cookies.push('WebToken=' + token);
    const dr = await axios_1.default.get(base + '/appointment/appointmentinday/', { headers: { Cookie: cookies.join('; '), Accept: 'text/html' }, maxRedirects: 5, validateStatus: () => true });
    upd(dr.headers);
    const sd = await axios_1.default.post(base + '/api/Home/SessionData', {}, { headers: { Cookie: cookies.join('; '), Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, validateStatus: () => true });
    console.log('SessionData:', sd.status);
    if (sd.data && typeof sd.data === 'object') {
        for (const k of Object.keys(sd.data)) {
            if (k.toLowerCase().includes('secret'))
                console.log('  FOUND:', k, '=', sd.data[k]);
        }
    }
    const bd = await axios_1.default.post(base + '/api/Home/GetBaseData', {}, { headers: { Cookie: cookies.join('; '), Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, validateStatus: () => true });
    console.log('GetBaseData:', bd.status);
    if (bd.data && typeof bd.data === 'object') {
        for (const k of Object.keys(bd.data)) {
            if (k.toLowerCase().includes('secret'))
                console.log('  FOUND:', k, '=', bd.data[k]);
        }
        console.log('  Keys:', Object.keys(bd.data).join(', '));
    }
    const sk = await axios_1.default.post(base + '/api/Home/GetSecretKey', {}, { headers: { Cookie: cookies.join('; '), Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, validateStatus: () => true });
    console.log('GetSecretKey:', sk.status, typeof sk.data === 'string' ? sk.data.slice(0, 100) : JSON.stringify(sk.data).slice(0, 100));
    const sk2 = await axios_1.default.post(base + '/api/Author/GetSecretKey', {}, { headers: { Cookie: cookies.join('; '), Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, validateStatus: () => true });
    console.log('Author/GetSecretKey:', sk2.status, typeof sk2.data === 'string' ? sk2.data.slice(0, 100) : JSON.stringify(sk2.data).slice(0, 100));
}
go();
//# sourceMappingURL=find-secret.js.map