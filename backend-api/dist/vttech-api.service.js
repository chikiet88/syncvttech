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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var VttechApiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VttechApiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const zlib = __importStar(require("zlib"));
let VttechApiService = VttechApiService_1 = class VttechApiService {
    configService;
    logger = new common_1.Logger(VttechApiService_1.name);
    axiosInstance;
    token = null;
    secretKey = null;
    cookies = [];
    xsrfToken = null;
    baseUrl;
    loginPromise = null;
    logCallback = null;
    constructor(configService) {
        this.configService = configService;
        this.baseUrl = this.configService.get('VTTECH_BASE_URL', 'https://tmtaza.vttechsolution.com');
        this.axiosInstance = axios_1.default.create({
            baseURL: this.baseUrl,
            maxRedirects: 0,
            validateStatus: () => true,
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
                'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Linux"',
                'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
            }
        });
        this.axiosInstance.interceptors.request.use(config => {
            const headers = config.headers || {};
            const ck = [...this.cookies];
            if (this.token && !ck.some(c => c.startsWith('WebToken=')))
                ck.push(`WebToken=${this.token}`);
            if (ck.length > 0)
                headers['Cookie'] = ck.join('; ');
            if (this.token && (config.url?.startsWith('/api/') || config.url?.startsWith('api/'))) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            if (this.secretKey)
                headers['secretkey'] = this.secretKey;
            if (this.xsrfToken)
                headers['xsrf-token'] = this.xsrfToken;
            headers['X-Requested-With'] = 'XMLHttpRequest';
            config.headers = headers;
            return config;
        });
        this.axiosInstance.interceptors.response.use(response => {
            this.updateCookies(response.headers['set-cookie']);
            return response;
        });
    }
    log(msg) {
        this.logger.log(msg);
        if (this.logCallback)
            this.logCallback(msg);
    }
    setLogCallback(cb) { this.logCallback = cb; }
    updateCookies(newCookies) {
        if (!newCookies)
            return;
        for (const raw of newCookies) {
            const firstPart = raw.split(';')[0];
            const name = firstPart.split('=')[0];
            this.cookies = this.cookies.filter(c => !c.startsWith(name + '='));
            this.cookies.push(firstPart);
        }
    }
    ensureCookie(name, value) {
        if (!this.cookies.some(c => c.startsWith(name + '='))) {
            this.cookies.push(`${name}=${value}`);
        }
    }
    async followRedirects(method, url, config, maxHops = 5) {
        let currentUrl = url;
        let currentMethod = method;
        let hops = 0;
        while (hops <= maxHops) {
            const resp = currentMethod === 'get'
                ? await this.axiosInstance.get(currentUrl, config)
                : await this.axiosInstance.post(currentUrl, config?.data, config);
            if (resp.status < 300 || resp.status >= 400)
                return resp;
            const location = resp.headers['location'];
            if (!location)
                return resp;
            currentUrl = location.startsWith('http') ? location : location;
            currentMethod = 'get';
            config = { ...config, data: undefined };
            hops++;
        }
        throw new Error('Too many redirects');
    }
    async login(force = false) {
        if (this.token && this.cookies.some(c => c.startsWith('.AspNetCore.Session=')) && !force)
            return true;
        if (this.loginPromise)
            return this.loginPromise;
        this.loginPromise = (async () => {
            try {
                const username = this.configService.get('VTTECH_USERNAME');
                const password = this.configService.get('VTTECH_PASSWORD');
                if (force) {
                    this.token = null;
                    this.cookies = [];
                    this.xsrfToken = null;
                    this.secretKey = null;
                }
                this.log(`🚀 [START LOGIN] User: ${username}`);
                const loginPageRes = await this.followRedirects('get', '/Login/Login?ver=' + Date.now(), {
                    headers: { 'Accept': 'text/html' }
                });
                if (typeof loginPageRes.data === 'string') {
                    const $ = cheerio.load(loginPageRes.data);
                    const formToken = $('input[name="__RequestVerificationToken"]').val();
                    if (formToken) {
                        this.xsrfToken = formToken;
                        this.log(`🔑 XSRF Token từ trang Login: ${formToken.slice(0, 20)}...`);
                    }
                }
                this.ensureCookie('.AspNetCore.Culture', 'c%3Den-US%7Cuic%3Dvi');
                this.ensureCookie('VTTECH_Menu_SideBarIsHide', 'false');
                let ip_encry = "";
                try {
                    const ipRes = await this.axiosInstance.post('/api/Author/GetIP', {}, {
                        headers: { 'Content-Type': 'application/json' }
                    });
                    ip_encry = ipRes.data?.ip_encry || "";
                }
                catch (e) { }
                const loginPayload = {
                    UserName: username, Password: password, PasswordEnCrypt: "",
                    IP: ip_encry, TokenFCM: "", From: "", SSO: "", Lan: "vi", TokenSSO: ""
                };
                const loginRes = await this.axiosInstance.post('/api/Author/Login', loginPayload, {
                    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'Referer': this.baseUrl + '/Login/Login/' }
                });
                const data = loginRes.data;
                if (data && data.Session) {
                    this.token = data.Session;
                    this.secretKey = data.SecretKey || data.secretkey || data.Secretkey
                        || this.configService.get('VTTECH_SECRET_KEY', 'ZdB9AsmlnaqopXnryYe8Uyj9YXaG0lZ09fNEljAifOESjErNDKj8TGtf0tGyKg2QpFsfOj5zQOUe+hiU1aN5mptaw7+sGwccT8pT0yFLgKE=');
                    this.log(`✅ Login OK. JWT: ${this.token.slice(0, 20)}... | SecretKey: ${this.secretKey ? 'SET' : 'NO'}`);
                    const dashRes = await this.followRedirects('get', '/appointment/appointmentinday/', { headers: { 'Accept': 'text/html' } });
                    this.log(`🏠 Dashboard: HTTP ${dashRes.status} (${typeof dashRes.data === 'string' ? dashRes.data.length : 0} bytes)`);
                    const reportPageRes = await this.followRedirects('get', '/report/reportgeneral/', {
                        headers: { 'Accept': 'text/html', 'Referer': this.baseUrl + '/' }
                    });
                    if (typeof reportPageRes.data === 'string' && !reportPageRes.data.trim().startsWith('<script>')) {
                        const $ = cheerio.load(reportPageRes.data);
                        const rToken = $('input[name="__RequestVerificationToken"]').val();
                        if (rToken) {
                            this.xsrfToken = rToken;
                            this.log(`🔑 XSRF Token từ Report page: ${rToken.slice(0, 20)}...`);
                        }
                    }
                    const cookieNames = this.cookies.map(c => c.split('=')[0]);
                    this.log(`🍪 Cookies (${cookieNames.length}): ${cookieNames.join(', ')}`);
                    const hasAntiforgery = cookieNames.some(n => n.includes('Antiforgery'));
                    this.log(`🛡️ Antiforgery cookie: ${hasAntiforgery ? '✅ CÓ' : '❌ THIẾU'}`);
                    return true;
                }
                this.log(`❌ Login failed: ${JSON.stringify(data)}`);
                return false;
            }
            catch (error) {
                this.log(`❌ Lỗi LOGIN: ${error.message}`);
                return false;
            }
            finally {
                this.loginPromise = null;
            }
        })();
        return this.loginPromise;
    }
    async getXsrfToken(page = '/Customer/ListCustomer/', force = false) {
        if (!force && this.xsrfToken)
            return this.xsrfToken;
        try {
            const resp = await this.followRedirects('get', page, {
                headers: { 'Referer': this.baseUrl + '/', 'Accept': 'text/html' }
            });
            if (typeof resp.data === 'string') {
                const $ = cheerio.load(resp.data);
                const token = $('input[name="__RequestVerificationToken"]').val();
                if (token) {
                    this.xsrfToken = token;
                    return token;
                }
            }
            return this.xsrfToken;
        }
        catch {
            return this.xsrfToken;
        }
    }
    decompress(data) {
        if (data && typeof data === 'object' && data['0'] !== undefined) {
            console.log('DEBUG decompress: Got numeric object (likely Binary) with keys:', Object.keys(data).length);
        }
        else if (typeof data === 'string') {
            console.log('DEBUG decompress: Got string (likely Base64) length:', data.length);
        }
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
    formatDate(dateStr) {
        if (!dateStr)
            return dateStr;
        const d = dateStr.split(' ')[0];
        const p = d.split('-');
        if (p.length === 3 && p[0].length === 4)
            return `${p[2]}-${p[1]}-${p[0]}`;
        return d;
    }
    buildFormBody(data, page) {
        const form = new URLSearchParams();
        const processed = { ...data };
        const isCustomerPage = page?.includes('/Customer/ListCustomer/');
        for (const k of ['dateFrom', 'dateTo', 'DateFrom', 'DateTo']) {
            if (processed[k]) {
                if (isCustomerPage) {
                    if (typeof processed[k] === 'string' && !processed[k].includes(':')) {
                        processed[k] = `${processed[k].split(' ')[0]} 00:00:00`;
                    }
                }
                else {
                    processed[k] = this.formatDate(processed[k]);
                }
            }
        }
        Object.keys(processed).forEach(k => form.append(k, String(processed[k])));
        return form;
    }
    handlerHeaders(page) {
        return {
            'xsrf-token': this.xsrfToken,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': page ? this.baseUrl + page.toLowerCase() : this.baseUrl + '/report/reportgeneral/?page=17',
            'Accept': '*/*',
            'Origin': this.baseUrl,
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
        };
    }
    async callHandler(page, handler, data) {
        await this.login();
        const url = `${page}?handler=${handler}`;
        const formBody = this.buildFormBody(data, page);
        const response = await this.axiosInstance.post(url, formBody, {
            headers: this.handlerHeaders(page),
        });
        if (response.status !== 200) {
            this.log(`⚠️ [${handler}] HTTP ${response.status} | ${response.headers['location'] || ''}`);
        }
        if (response.status >= 300 && response.status < 400) {
            this.log(`🔄 Re-login và thử lại ${handler}...`);
            await this.login(true);
            const retryBody = this.buildFormBody(data, page);
            const retry = await this.axiosInstance.post(url, retryBody, {
                headers: this.handlerHeaders(page),
            });
            if (retry.status >= 300 || (typeof retry.data === 'string' && retry.data.trim().startsWith('<'))) {
                this.log(`❌ Retry failed: status=${retry.status}`);
                return [];
            }
            const d = this.decompress(retry.data);
            const c = Array.isArray(d) ? d.length : (d?.Table?.length || 0);
            this.log(`📥 [RETRY OK] ${handler}: ${c} recs.`);
            return d;
        }
        if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
            this.log(`⚠️ [HTML] ${handler}: Got HTML instead of data (status ${response.status})`);
            return [];
        }
        if (response.status === 400) {
            this.log(`❌ [${handler}] HTTP 400 - XSRF validation failed`);
            return [];
        }
        const decompressed = this.decompress(response.data);
        const count = Array.isArray(decompressed) ? decompressed.length : (decompressed?.Table?.length || 0);
        this.log(`📥 [API RESPONSE] ${handler}: ${count} recs.`);
        return decompressed;
    }
    async callApi(url, data) {
        await this.login();
        const resp = await this.axiosInstance.post(url, data);
        if (resp.status >= 400)
            throw new Error(`API error: ${resp.status}`);
        return this.decompress(resp.data);
    }
    async checkLoginStatus(u, p) {
        const ok = await this.login(true);
        return { success: ok, message: ok ? 'OK' : 'Failed', user: u || this.configService.get('VTTECH_USERNAME') };
    }
    async fetchExtensions() { return this.callHandler('/marketing/ticketgeneral/', 'LoadIni', {}); }
    async fetchTicketGroups() { const r = await this.callHandler('/marketing/ticketgeneral/', 'LoadIni', {}); return r?.TicketGroups || []; }
    async fetchCallHistory(dateFrom, dateTo) {
        return this.callHandler('/marketing/call/historycall/', 'LoadData', {
            DateFrom: dateFrom, DateTo: dateTo, BranchID: 0, Type: 0
        });
    }
    async getRevenueByBranch(dateFrom, dateTo, branchId) {
        return this.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'LoadataDetailByBranch', {
            branchID: branchId.toString(), dateFrom, dateTo
        });
    }
};
exports.VttechApiService = VttechApiService;
exports.VttechApiService = VttechApiService = VttechApiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], VttechApiService);
//# sourceMappingURL=vttech-api.service.js.map