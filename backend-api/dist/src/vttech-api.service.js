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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let VttechApiService = VttechApiService_1 = class VttechApiService {
    configService;
    syncQueue;
    logger = new common_1.Logger(VttechApiService_1.name);
    axiosInstance;
    sessions = [];
    currentSessionIndex = 0;
    globalLastUsedAt = 0;
    GLOBAL_MIN_DELAY = 1000;
    LOGIN_TIMEOUT = 45000;
    baseUrl;
    logCallback = null;
    constructor(configService, syncQueue) {
        this.configService = configService;
        this.syncQueue = syncQueue;
        this.baseUrl = this.configService.get('VTTECH_BASE_URL', 'https://tmtaza.vttechsolution.com');
        const accountStr = this.configService.get('VTTECH_ACCOUNTS');
        if (accountStr) {
            const pairs = accountStr.split(',');
            for (const p of pairs) {
                const [u, pass] = p.split(':');
                if (u && pass)
                    this.sessions.push(this.createNewSession(u, pass));
            }
        }
        if (this.sessions.length === 0) {
            const u = this.configService.get('VTTECH_USERNAME');
            const p = this.configService.get('VTTECH_PASSWORD');
            if (u && p)
                this.sessions.push(this.createNewSession(u, p));
        }
        this.logger.log(`🚀 [INIT] VttechApiService với ${this.sessions.length} tài khoản.`);
        this.axiosInstance = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            validateStatus: () => true,
            maxRedirects: 0,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
            }
        });
        this.axiosInstance.interceptors.request.use(config => {
            let session = config.session;
            if (!session)
                return config;
            const realSession = this.sessions.find(s => s.username === session.username);
            if (realSession)
                session = realSession;
            const headers = config.headers || {};
            const ck = [...session.cookies];
            if (session.token) {
                const tokenValue = session.token;
                for (const cookieName of ['WebToken', 'Token', 'token']) {
                    const cookieStr = `${cookieName}=${tokenValue}`;
                    const idx = ck.findIndex(c => c.startsWith(cookieName + '='));
                    if (idx !== -1)
                        ck[idx] = cookieStr;
                    else
                        ck.push(cookieStr);
                }
                headers['Authorization'] = `Bearer ${session.token}`;
            }
            if (ck.length > 0) {
                headers['Cookie'] = ck.join('; ');
            }
            if (session.secretKey)
                headers['secretkey'] = session.secretKey;
            if (session.xsrfToken) {
                headers['xsrf-token'] = session.xsrfToken;
                headers['RequestVerificationToken'] = session.xsrfToken;
                headers['X-XSRF-TOKEN'] = session.xsrfToken;
                headers['X-Request-Verification-Token'] = session.xsrfToken;
            }
            headers['X-Requested-With'] = 'XMLHttpRequest';
            config.headers = headers;
            return config;
        });
        this.axiosInstance.interceptors.response.use(response => {
            const session = response.config.session;
            if (session) {
                const realSession = this.sessions.find(s => s.username === session.username);
                this.updateSessionCookies(realSession || session, response.headers['set-cookie']);
            }
            return response;
        });
    }
    async onModuleInit() {
        await this.loadSessionsFromRedis();
    }
    async loadSessionsFromRedis() {
        try {
            const redis = await this.syncQueue.client;
            if (!redis)
                return;
            this.logger.log('⏳ Đang khôi phục các session VTTech từ Redis...');
            for (const s of this.sessions) {
                const cached = await redis.get(`vttech:session:${s.username}`);
                if (cached) {
                    try {
                        const data = JSON.parse(cached);
                        s.token = data.token || null;
                        s.secretKey = data.secretKey || null;
                        s.cookies = data.cookies || [];
                        s.xsrfToken = data.xsrfToken || null;
                        s.lastUsedAt = data.lastUsedAt || 0;
                        this.logger.log(`🔑 Đã khôi phục session cho: ${s.username} (Token: ${s.token ? 'OK' : 'NULL'})`);
                    }
                    catch (pe) {
                        this.logger.warn(`⚠️ Lỗi parse session JSON cho ${s.username}: ${pe.message}`);
                    }
                }
            }
        }
        catch (e) {
            this.logger.warn(`⚠️ Lỗi khôi phục session từ Redis: ${e.message}`);
        }
    }
    async saveSessionToRedis(session) {
        try {
            const redis = await this.syncQueue.client;
            if (!redis)
                return;
            const data = {
                token: session.token,
                secretKey: session.secretKey,
                cookies: session.cookies,
                xsrfToken: session.xsrfToken,
                lastUsedAt: session.lastUsedAt
            };
            await redis.set(`vttech:session:${session.username}`, JSON.stringify(data), 'EX', 86400 * 7);
        }
        catch (e) {
            this.logger.warn(`⚠️ Lỗi lưu session vào Redis cho ${session.username}: ${e.message}`);
        }
    }
    createNewSession(u, p) {
        return {
            username: u, password: p,
            token: null, secretKey: null, cookies: [], xsrfToken: null,
            lastUsedAt: 0, errorCount: 0, lastErrorAt: 0, loginByUsernamePromise: null, lock: null
        };
    }
    updateSessionCookies(session, newCookies) {
        if (!newCookies || !Array.isArray(newCookies))
            return;
        let changed = false;
        for (const raw of newCookies) {
            const firstPart = raw.split(';')[0];
            const [name] = firstPart.split('=');
            if (!name)
                continue;
            const index = session.cookies.findIndex(c => c.startsWith(name + '='));
            if (index !== -1) {
                if (session.cookies[index] !== firstPart) {
                    session.cookies[index] = firstPart;
                    changed = true;
                }
            }
            else {
                session.cookies.push(firstPart);
                changed = true;
            }
        }
        if (changed) {
            this.saveSessionToRedis(session).catch(() => { });
        }
    }
    ensureSessionCookie(session, name, value) {
        if (!session.cookies.some(c => c.startsWith(name + '='))) {
            session.cookies.push(`${name}=${value}`);
        }
    }
    getBestSession() {
        if (this.sessions.length === 0)
            throw new Error('No sessions available');
        const now = Date.now();
        const activeSessions = this.sessions.filter(s => s.errorCount <= 5 || (now - s.lastErrorAt > 900000));
        const sessionsToUse = activeSessions.length > 0 ? activeSessions : this.sessions;
        const idleSessions = sessionsToUse.filter(s => !s.lock).sort((a, b) => a.lastUsedAt - b.lastUsedAt);
        if (idleSessions.length > 0)
            return idleSessions[0];
        const session = sessionsToUse[this.currentSessionIndex % sessionsToUse.length];
        this.currentSessionIndex = (this.currentSessionIndex + 1) % sessionsToUse.length;
        return session;
    }
    async delayForSession(session) {
        const now = Date.now();
        const sessionElapsed = now - session.lastUsedAt;
        const sessionMinDelay = 2000;
        if (sessionElapsed < sessionMinDelay) {
            await new Promise(r => setTimeout(r, sessionMinDelay - sessionElapsed));
        }
        const globalNow = Date.now();
        const globalElapsed = globalNow - this.globalLastUsedAt;
        if (globalElapsed < this.GLOBAL_MIN_DELAY) {
            const wait = this.GLOBAL_MIN_DELAY - globalElapsed;
            await new Promise(r => setTimeout(r, wait));
        }
        this.globalLastUsedAt = Date.now();
        session.lastUsedAt = Date.now();
    }
    async withSessionLock(session, fn) {
        while (session.lock) {
            await session.lock;
        }
        let unlock;
        session.lock = new Promise(resolve => {
            unlock = resolve;
        });
        try {
            return await fn();
        }
        finally {
            session.lock = null;
            unlock();
        }
    }
    log(msg) {
        this.logger.log(msg);
        if (this.logCallback)
            this.logCallback(msg);
    }
    setLogCallback(cb) { this.logCallback = cb; }
    async followRedirects(session, method, url, config, maxHops = 5) {
        let currentUrl = url;
        let currentMethod = method;
        let hops = 0;
        while (hops <= maxHops) {
            const finalConfig = { ...config, session };
            const resp = currentMethod === 'get'
                ? await this.axiosInstance.get(currentUrl, finalConfig)
                : await this.axiosInstance.post(currentUrl, config?.data, finalConfig);
            if (resp.status >= 300 && resp.status < 400) {
                const location = resp.headers['location'];
                const setCookie = resp.headers['set-cookie'];
                const isLoicansua = location?.includes('index.html') || (setCookie ? (Array.isArray(setCookie) ? setCookie.length : 1) : 0) === 0;
                this.log(`↪️ ${isLoicansua ? '[Loicansua] ' : ''}[${session.username}] Redirect (${resp.status}): ${currentUrl} -> ${location} | Cookies: ${setCookie ? (Array.isArray(setCookie) ? setCookie.length : 1) : 0}`);
                if (location === currentUrl || (location && location.endsWith(currentUrl))) {
                    return resp;
                }
                currentUrl = location || '';
                currentMethod = 'get';
                config = { ...config, data: undefined };
                hops++;
            }
            else {
                return resp;
            }
        }
        throw new Error('Too many redirects');
    }
    async login(session, force = false) {
        const s = session || this.getBestSession();
        try {
            const redis = await this.syncQueue.client;
            if (redis) {
                const isLocked = await redis.get(`vttech:circuit_breaker:${s.username}`);
                if (isLocked) {
                    this.log(`🔌 [Circuit Breaker] Bỏ qua login cho ${s.username} do đang trong trạng thái ngắt mạch (lock).`);
                    return false;
                }
            }
        }
        catch (e) { }
        const hasSession = !!s.token;
        if (hasSession && !force)
            return true;
        if (s.loginByUsernamePromise)
            return s.loginByUsernamePromise;
        s.loginByUsernamePromise = (async () => {
            try {
                if (force) {
                    s.token = null;
                    s.cookies = [];
                    s.xsrfToken = null;
                    s.secretKey = null;
                }
                this.log(`🚀 [START LOGIN] User: ${s.username}`);
                const loginPageRes = await this.followRedirects(s, 'get', '/Login/Login?ver=' + Date.now(), {
                    headers: { 'Accept': 'text/html' },
                    timeout: this.LOGIN_TIMEOUT
                });
                if (typeof loginPageRes.data === 'string') {
                    const $ = cheerio.load(loginPageRes.data);
                    const scriptContent = $('script').map((_, el) => $(el).html()).get().join('\n');
                    const skMatch = scriptContent.match(/sys_SecretKey\s*=\s*['"]([^'"]+)['"]/i) ||
                        scriptContent.match(/SecretKey\s*[:=]\s*['"]([^'"]+)['"]/i);
                    if (skMatch && skMatch[1])
                        s.secretKey = skMatch[1];
                    const formToken = $('input[name="__RequestVerificationToken"]').val();
                    if (formToken)
                        s.xsrfToken = formToken;
                }
                this.ensureSessionCookie(s, '.AspNetCore.Culture', 'c%3Den-US%7Cuic%3Dvi');
                await new Promise(r => setTimeout(r, 500));
                const loginPayload = {
                    UserName: s.username, Password: s.password, PasswordEnCrypt: "",
                    IP: "", TokenFCM: "", From: "", SSO: "", Lan: "vi", TokenSSO: ""
                };
                const loginRes = await this.axiosInstance.post('/api/Author/Login', loginPayload, {
                    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'Referer': this.baseUrl + '/Login/Login/' },
                    session: s,
                    timeout: this.LOGIN_TIMEOUT
                });
                const data = loginRes.data;
                if (data && data.Session) {
                    s.token = data.Session;
                    s.secretKey = data.SecretKey || data.secretkey || s.secretKey || '';
                    this.log(`✅ Login OK [${s.username}]. SK: ${s.secretKey ? 'OK' : '???'} | Token: ${s.token?.slice(0, 10)}...`);
                    if (data.XSRFToken) {
                        s.xsrfToken = data.XSRFToken;
                        this.log(`💡 [${s.username}] Found XSRF in login response: ${s.xsrfToken?.slice(0, 10)}...`);
                    }
                    await this.followRedirects(s, 'get', '/', { headers: { 'Accept': 'text/html' }, timeout: this.LOGIN_TIMEOUT });
                    await this.axiosInstance.get('/api/Home/Language/?ver=' + Date.now(), { session: s, timeout: this.LOGIN_TIMEOUT });
                    await this.axiosInstance.post('/api/Home/SessionData', {}, {
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.token}` },
                        session: s,
                        timeout: this.LOGIN_TIMEOUT
                    });
                    await this.followRedirects(s, 'get', '/Main/Dashboard/', { headers: { 'Accept': 'text/html' }, timeout: this.LOGIN_TIMEOUT });
                    await this.getXsrfToken(s, '/Customer/ListCustomer/', true);
                    s.errorCount = 0;
                    try {
                        const redis = await this.syncQueue.client;
                        if (redis) {
                            await redis.del(`vttech:circuit_breaker:${s.username}`);
                        }
                    }
                    catch (e) { }
                    await this.saveSessionToRedis(s);
                    return true;
                }
                return false;
            }
            catch (error) {
                this.log(`❌ Lỗi LOGIN [${s.username}]: ${error.message}`);
                s.errorCount++;
                s.lastErrorAt = Date.now();
                if (s.errorCount >= 3) {
                    try {
                        const redis = await this.syncQueue.client;
                        if (redis) {
                            await redis.set(`vttech:circuit_breaker:${s.username}`, 'true', 'EX', 300);
                            this.log(`🔌 [Circuit Breaker] Đã kích hoạt ngắt mạch cho ${s.username} (Khóa login 5 phút) do thất bại liên tiếp.`);
                        }
                    }
                    catch (re) { }
                }
                return false;
            }
            finally {
                s.loginByUsernamePromise = null;
            }
        })();
        return s.loginByUsernamePromise;
    }
    async getXsrfToken(session, page = '/Customer/ListCustomer/', force = false) {
        const s = session || this.getBestSession();
        if (!force && s.xsrfToken)
            return s.xsrfToken;
        const pagesToTry = [page, '/Report/ReportGeneral/', '/', '/Login/Login/'];
        if (page !== '/Customer/ListCustomer/')
            pagesToTry.unshift('/Customer/ListCustomer/');
        const uniquePages = [...new Set(pagesToTry)];
        for (const targetPage of uniquePages) {
            try {
                const resp = await this.followRedirects(s, 'get', targetPage, {
                    headers: { 'Referer': this.baseUrl + '/', 'Accept': 'text/html' },
                    timeout: this.LOGIN_TIMEOUT
                });
                if (typeof resp.data === 'string') {
                    const $ = cheerio.load(resp.data);
                    const token = $('input[name="__RequestVerificationToken"]').val() ||
                        $('meta[name="request-verification-token"]').attr('content') ||
                        $('meta[name="xsrf-token"]').attr('content') ||
                        $('meta[name="RequestVerificationToken"]').attr('content');
                    if (token) {
                        s.xsrfToken = token;
                        this.log(`✅ [${s.username}] Extracted XSRF from ${targetPage}: ${s.xsrfToken.slice(0, 10)}...`);
                        await this.saveSessionToRedis(s).catch(() => { });
                        return s.xsrfToken;
                    }
                    if (targetPage === '/') {
                    }
                    const xsrfCookie = s.cookies.find(c => c.toLowerCase().includes('xsrf-token') || c.toLowerCase().includes('antiforgery'));
                    if (xsrfCookie) {
                        const m = xsrfCookie.match(/=([^;]+)/);
                        if (m && m[1] && m[1].length > 20) {
                            this.log(`💡 [Loicansua] [${s.username}] Found potential token in cookie: ${xsrfCookie.slice(0, 30)}...`);
                        }
                    }
                    const scriptMatches = resp.data.match(/["']?RequestVerificationToken["']?\s*[:=]\s*["']([^"']+)["']/i);
                    if (scriptMatches && scriptMatches[1]) {
                        s.xsrfToken = scriptMatches[1];
                        this.log(`✅ [${s.username}] Extracted XSRF from ${targetPage} script: ${s.xsrfToken.slice(0, 10)}...`);
                        await this.saveSessionToRedis(s).catch(() => { });
                        return s.xsrfToken;
                    }
                }
            }
            catch (e) {
                this.log(`⚠️ [${s.username}] Error fetching XSRF from ${targetPage}: ${e.message}`);
            }
        }
        this.log(`❌ [Loicansua] [${s.username}] Global fail to get XSRF token after trying multiple pages.`);
        return s.xsrfToken;
    }
    decompress(data) {
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
    buildFormBody(data, session) {
        const formBody = new URLSearchParams();
        const processed = { ...data };
        for (const k of ['dateFrom', 'dateTo', 'DateFrom', 'DateTo']) {
            if (processed[k]) {
                const d = new Date(processed[k]);
                if (!isNaN(d.getTime())) {
                    processed[k] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                }
            }
        }
        Object.keys(processed).forEach(k => formBody.append(k, String(processed[k])));
        if (session.xsrfToken)
            formBody.append('__RequestVerificationToken', session.xsrfToken);
        return formBody;
    }
    handlerHeaders(session, page) {
        return {
            'Accept': '*/*',
            'X-Requested-With': 'XMLHttpRequest',
            'secretkey': session.secretKey || '',
            'xsrf-token': session.xsrfToken || '',
            'RequestVerificationToken': session.xsrfToken || '',
            'Authorization': session.token ? `Bearer ${session.token}` : '',
            'Referer': page ? this.baseUrl + page : this.baseUrl + '/',
        };
    }
    async callHandler(page, handler, data, username) {
        const session = username ? (this.sessions.find(s => s.username === username) || this.getBestSession()) : this.getBestSession();
        return this.withSessionLock(session, async () => {
            let retryCount = 0;
            const maxRetries = 2;
            let lastError = null;
            while (retryCount <= maxRetries) {
                try {
                    const redis = await this.syncQueue.client;
                    if (redis) {
                        const isLocked = await redis.get(`vttech:circuit_breaker:${session.username}`);
                        if (isLocked) {
                            throw new Error(`[Circuit Breaker] Chặn đăng nhập tài khoản ${session.username}`);
                        }
                    }
                    const loginOk = await this.login(session, retryCount > 0);
                    if (!loginOk) {
                        if (retryCount > 0) {
                            this.log(`⚠️ [Loicansua] [${session.username}] Re-login failed during retry ${retryCount}. Waiting 5s...`);
                            await new Promise(r => setTimeout(r, 5000));
                        }
                        throw new Error(`Đăng nhập thất bại cho tài khoản ${session.username}`);
                    }
                    await this.delayForSession(session);
                    if (!session.xsrfToken || retryCount > 0) {
                        await this.getXsrfToken(session, page, retryCount > 0);
                    }
                    const url = `${page}?handler=${handler}`;
                    const formBody = this.buildFormBody(data, session);
                    const handlerHeaders = this.handlerHeaders(session, page);
                    this.log(`📡 [Attempt ${retryCount + 1}] Calling: ${url} [${session.username}]`);
                    const response = await this.axiosInstance.post(url, formBody, {
                        headers: handlerHeaders,
                        session
                    });
                    const isSessionIssue = response.status === 302 || response.status === 401 || response.status === 400 ||
                        (typeof response.data === 'string' &&
                            (response.data.includes('<!DOCTYPE html>') ||
                                response.data.includes('<title>VTTech Solution</title>') ||
                                response.data.includes('sys_SecretKey')));
                    if (isSessionIssue) {
                        const reason = response.status === 302 ? 'Redirect' :
                            response.status === 400 ? 'Bad Request/Token' :
                                typeof response.data === 'string' && response.data.includes('<title>') ? 'Login Page Redirect' : 'Session Expired';
                        this.log(`⚠️ [Loicansua] [${session.username}] ${reason} detected. Retrying ${retryCount + 1}/${maxRetries}...`);
                        if (typeof response.data === 'string' && response.data.trim().startsWith('<') && retryCount === maxRetries) {
                            this.log(`❌ [Loicansua] [${session.username}] Final attempt failed. HTML snippet: ${response.data.trim().slice(0, 200)}`);
                        }
                        if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
                            await new Promise(r => setTimeout(r, 10000 * (retryCount + 1)));
                        }
                        retryCount++;
                        continue;
                    }
                    session.errorCount = 0;
                    return this.decompress(response.data);
                }
                catch (e) {
                    lastError = e;
                    if (e.message.includes('[Circuit Breaker]')) {
                        break;
                    }
                    session.errorCount++;
                    session.lastErrorAt = Date.now();
                    this.log(`❌ [Loicansua] [${session.username}] Exception in callHandler: ${e.message}. Retry ${retryCount + 1}...`);
                    await new Promise(r => setTimeout(r, 2000));
                    retryCount++;
                }
            }
            this.log(`🔥 [Loicansua] [${session.username}] All retries failed for ${handler}.`);
            throw new Error(`[VTTech API] All retries failed for ${handler} after ${maxRetries + 1} attempts. Lỗi cuối: ${lastError?.message}`);
        });
    }
    async callApi(url, data) {
        const session = this.getBestSession();
        await this.login(session);
        await this.delayForSession(session);
        const resp = await this.axiosInstance.post(url, data, { session });
        return this.decompress(resp.data);
    }
    async checkLoginStatus() {
        const results = await Promise.all(this.sessions.map(async (s) => {
            const ok = await this.login(s, true);
            return { username: s.username, success: ok };
        }));
        const okCount = results.filter(r => r.success).length;
        return {
            success: okCount === this.sessions.length,
            message: `${okCount}/${this.sessions.length} accounts OK`,
            accounts: this.sessions.length,
            details: results
        };
    }
    async fetchExtensions() { return this.callHandler('/marketing/ticketgeneral/', 'LoadIni', {}); }
    async fetchTicketGroups() { const r = await this.callHandler('/marketing/ticketgeneral/', 'LoadIni', {}); return r?.TicketGroups || []; }
    async fetchCallHistory(dateFrom, dateTo) {
        return this.callHandler('/marketing/call/historycall/', 'LoadData', { DateFrom: dateFrom, DateTo: dateTo, BranchID: 0, Type: 0 });
    }
    async getRevenueByBranch(dateFrom, dateTo, branchId) {
        return this.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'LoadataDetailByBranch', { BranchID: branchId.toString(), dateFrom, dateTo });
    }
    async getPaymentByBranch(dateFrom, dateTo, branchId) {
        return this.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'LoadataPaymentDetailByBranch', { BranchID: branchId.toString(), dateFrom, dateTo });
    }
    async getDepositByBranch(dateFrom, dateTo, branchId) {
        return this.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'LoadataDepositDetailByBranch', { BranchID: branchId.toString(), dateFrom, dateTo });
    }
};
exports.VttechApiService = VttechApiService;
exports.VttechApiService = VttechApiService = VttechApiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)('sync-queue')),
    __metadata("design:paramtypes", [config_1.ConfigService,
        bullmq_2.Queue])
], VttechApiService);
//# sourceMappingURL=vttech-api.service.js.map