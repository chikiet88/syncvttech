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
    pageTokens = new Map();
    baseUrl;
    loginPromise = null;
    constructor(configService) {
        this.configService = configService;
        this.baseUrl = this.configService.get('VTTECH_BASE_URL', 'https://tmtaza.vttechsolution.com');
        this.axiosInstance = axios_1.default.create({
            baseURL: this.baseUrl,
            withCredentials: true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': this.baseUrl,
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        this.axiosInstance.interceptors.request.use(config => {
            const headers = config.headers || {};
            if (this.cookies.length > 0) {
                headers['Cookie'] = this.cookies.join('; ');
            }
            if (this.token && config.url?.startsWith('/api/')) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            if (this.secretKey) {
                headers['SecretKey'] = this.secretKey;
            }
            if (this.xsrfToken) {
                headers['XSRF-TOKEN'] = this.xsrfToken;
                headers['RequestVerificationToken'] = this.xsrfToken;
            }
            headers['X-Requested-With'] = 'XMLHttpRequest';
            config.headers = headers;
            return config;
        });
    }
    log(msg) {
        this.logger.log(msg);
    }
    updateCookies(newCookies) {
        if (newCookies) {
            newCookies.forEach(newCookie => {
                const parts = newCookie.split(';');
                const firstPart = parts[0];
                const name = firstPart.split('=')[0];
                this.cookies = this.cookies.filter(c => !c.startsWith(name + '='));
                this.cookies.push(firstPart);
            });
        }
    }
    async login(force = false) {
        if (this.token && !force)
            return true;
        if (this.loginPromise)
            return this.loginPromise;
        this.loginPromise = (async () => {
            try {
                this.log('🔐 Đang đăng nhập VTTech bằng Form mechanism...');
                const username = this.configService.get('VTTECH_USERNAME');
                const password = this.configService.get('VTTECH_PASSWORD');
                const loginPageResponse = await this.axiosInstance.get('/Login/Login/');
                this.updateCookies(loginPageResponse.headers['set-cookie']);
                const ipTokenMatch = loginPageResponse.data.match(/[a-zA-Z0-9+/]{40,}=/);
                const ipToken = ipTokenMatch ? ipTokenMatch[0] : 'JLYxMl2Tcnfvfg10lGR3eFj9RqdxiUv8yqkI1bVUAsg=';
                this.log(`📡 Sử dụng IP Token: ${ipToken.slice(0, 10)}...`);
                const response = await this.axiosInstance.post('/api/Author/Login', {
                    UserName: username,
                    Password: password,
                    IP: ipToken,
                    PasswordEnCrypt: '',
                    Lan: 'vi',
                    TokenFCM: '',
                    From: '',
                    SSO: '',
                    TokenSSO: ''
                });
                if (response.data?.Session) {
                    this.token = response.data.Session;
                    this.secretKey = response.data.SecretKey || '0XsDK8L1WcsP+0Wo15z2KFtFKPSGZAr7iLu12AhuFV7mxcX/CBtVSOvvIaOXS3ARGP8CRxLbVFYk1BUlNd5MpAqH7nE6gys21rS1xheq0Jo=';
                    this.updateCookies(response.headers['set-cookie']);
                    this.cookies = this.cookies.filter(c => !c.startsWith('WebToken='));
                    this.cookies.push(`WebToken=${this.token}`);
                    this.log('✅ Đăng nhập thành công (Form mode)');
                    try {
                        const homeRes = await this.axiosInstance.get('/');
                        this.updateCookies(homeRes.headers['set-cookie']);
                        const redirectRes = await this.axiosInstance.get('/appointment/appointmentinday/');
                        this.updateCookies(redirectRes.headers['set-cookie']);
                        this.log('🏠 Đã thiết lập Session portal (Redirect followed)');
                    }
                    catch (e) {
                        this.log(`⚠️ Lỗi khi establish session portal: ${e.message}`);
                    }
                    return true;
                }
                this.log(`❌ Đăng nhập thất bại: ${JSON.stringify(response.data)}`);
                return false;
            }
            catch (error) {
                this.log(`❌ Lỗi đăng nhập: ${error.message}`);
                return false;
            }
            finally {
                this.loginPromise = null;
            }
        })();
        return this.loginPromise;
    }
    async getXsrfToken(page = '/Customer/ListCustomer/') {
        try {
            this.log(`📡 Đang lấy XSRF Token cho trang ${page}...`);
            const response = await this.axiosInstance.get(page);
            this.updateCookies(response.headers['set-cookie']);
            const $ = cheerio.load(response.data);
            const token = $('input[name="__RequestVerificationToken"]').val();
            if (token) {
                this.pageTokens.set(page, token);
                this.xsrfToken = token;
                this.log(`✅ Đã lấy XSRF Token cho ${page}: ${token.slice(0, 10)}...`);
                return token;
            }
            else {
                this.log(`⚠️ Không tìm thấy XSRF Token trong trang ${page}`);
            }
        }
        catch (error) {
            this.log(`❌ Lỗi lấy XSRF Token cho ${page}: ${error.message}`);
        }
        return null;
    }
    decompress(data) {
        if (!data)
            return null;
        if (typeof data !== 'string')
            return data;
        try {
            const cleanData = data.replace(/^"|"$/g, '');
            const buffer = Buffer.from(cleanData, 'base64');
            try {
                const decompressed = zlib.gunzipSync(buffer);
                return JSON.parse(decompressed.toString('utf-8'));
            }
            catch (e) {
                try {
                    const decompressed = zlib.inflateSync(buffer);
                    return JSON.parse(decompressed.toString('utf-8'));
                }
                catch (e2) {
                    const decompressed = zlib.inflateRawSync(buffer);
                    return JSON.parse(decompressed.toString('utf-8'));
                }
            }
        }
        catch (error) {
            try {
                return JSON.parse(data);
            }
            catch (e) {
                return data;
            }
        }
    }
    async callHandler(page, handler, data) {
        try {
            await new Promise(resolve => setTimeout(resolve, 5000));
            await this.login();
            const pageKey = page.split('?')[0];
            let token = this.pageTokens.get(pageKey);
            if (!token) {
                token = (await this.getXsrfToken(pageKey)) || undefined;
            }
            const url = `${page}?handler=${handler}`;
            const formData = new URLSearchParams();
            if (token)
                formData.append('__RequestVerificationToken', token);
            Object.keys(data).forEach(key => {
                formData.append(key, data[key]);
            });
            const response = await this.axiosInstance.post(url, formData, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            if (typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE')) {
                this.log(`⚠️  [${handler}] Nhận về HTML thay vì dữ liệu. Có thể do handler sai hoặc session hết hạn.`);
            }
            this.log(`   🔸 [${handler}] Response sample: ${String(response.data).slice(0, 100)}`);
            const result = this.decompress(response.data);
            return result;
        }
        catch (error) {
            this.log(`❌ Lỗi gọi Handler ${handler} trên ${page}: ${error.message}`);
            if (error.response?.status === 401) {
                this.token = null;
            }
            throw error;
        }
    }
    async callApi(url, data) {
        try {
            await this.login();
            const response = await this.axiosInstance.post(url, data);
            return response.data;
        }
        catch (e) {
            this.log(`❌ Lỗi gọi API ${url}: ${e.message}`);
            throw e;
        }
    }
    async fetchExtensions() {
        return this.callHandler('/marketing/ticketgeneral/', 'LoadIni', {});
    }
    async fetchTicketGroups() {
        const res = await this.callHandler('/marketing/ticketgeneral/', 'LoadIni', {});
        return res.TicketGroups || [];
    }
    async fetchCallHistory(dateFrom, dateTo) {
        const formatDate = (s) => {
            const [y, m, d] = s.split('-');
            return `${d}-${m}-${y}`;
        };
        return this.callHandler('/marketing/call/historycall/', 'LoadData', {
            DateFrom: formatDate(dateFrom),
            DateTo: formatDate(dateTo),
            BranchID: 0,
            Type: 0
        });
    }
    logCallback = null;
    setLogCallback(callback) {
        this.logCallback = callback;
    }
    async getRevenueByBranch(dateFrom, dateTo, branchId) {
        const formatDate = (s) => {
            const [y, m, d] = s.split('-');
            return `${d}-${m}-${y}`;
        };
        return this.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'LoadataDetailByBranch', {
            branchID: branchId,
            dateFrom: formatDate(dateFrom),
            dateTo: formatDate(dateTo),
        });
    }
};
exports.VttechApiService = VttechApiService;
exports.VttechApiService = VttechApiService = VttechApiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], VttechApiService);
//# sourceMappingURL=vttech-api.service.js.map