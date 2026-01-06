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
const axios_1 = __importDefault(require("axios"));
const zlib = __importStar(require("zlib"));
const cheerio = __importStar(require("cheerio"));
const config_1 = require("@nestjs/config");
let VttechApiService = VttechApiService_1 = class VttechApiService {
    configService;
    logger = new common_1.Logger(VttechApiService_1.name);
    axiosInstance;
    token = null;
    xsrfToken = null;
    cookies = [];
    logCallback;
    constructor(configService) {
        this.configService = configService;
        this.axiosInstance = axios_1.default.create({
            baseURL: this.configService.get('VTTECH_BASE_URL', 'https://tmtaza.vttechsolution.com'),
            withCredentials: true,
        });
    }
    setLogCallback(callback) {
        this.logCallback = callback;
    }
    log(msg, isError = false) {
        if (isError) {
            this.logger.error(msg);
        }
        else {
            this.logger.log(msg);
        }
        if (this.logCallback) {
            this.logCallback(msg);
        }
    }
    updateCookies(newCookies) {
        if (!newCookies)
            return;
        newCookies.forEach(newCookie => {
            const cookieName = newCookie.split('=')[0];
            this.cookies = this.cookies.filter(c => !c.startsWith(cookieName + '='));
            this.cookies.push(newCookie.split(';')[0]);
        });
        if (this.token) {
            this.cookies = this.cookies.filter(c => !c.startsWith('WebToken='));
            this.cookies.push(`WebToken=${this.token}`);
        }
        this.axiosInstance.defaults.headers.common['Cookie'] = this.cookies.join('; ');
    }
    async login() {
        this.log('🔐 Đang đăng nhập VTTech...');
        const username = this.configService.get('VTTECH_USERNAME');
        const password = this.configService.get('VTTECH_PASSWORD');
        try {
            this.log(`📡 Gửi request đăng nhập cho user: ${username}`);
            const response = await this.axiosInstance.post('/api/Author/Login', {
                username,
                password,
                passwordcrypt: '',
                from: '',
                sso: '',
                ssotoken: '',
            });
            if (response.data?.Session) {
                this.token = response.data.Session;
                this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
                this.updateCookies(response.headers['set-cookie']);
                this.log('✅ Đăng nhập thành công, đã lưu Session Token');
                return true;
            }
            this.log('❌ Đăng nhập thất bại: Không tìm thấy Session trong response', true);
            return false;
        }
        catch (error) {
            this.log(`❌ Lỗi đăng nhập: ${error.message}`, true);
            return false;
        }
    }
    async getXsrfToken() {
        try {
            this.log('📡 Đang lấy XSRF Token từ /Customer/ListCustomer/...');
            const response = await this.axiosInstance.get('/Customer/ListCustomer/');
            this.updateCookies(response.headers['set-cookie']);
            const $ = cheerio.load(response.data);
            this.xsrfToken = $('input[name="__RequestVerificationToken"]').val();
            if (this.xsrfToken) {
                this.log('✅ Đã lấy XSRF Token thành công');
            }
            else {
                this.log('⚠️ Không tìm thấy XSRF Token trong trang');
            }
            return this.xsrfToken;
        }
        catch (error) {
            this.log(`❌ Lỗi lấy XSRF Token: ${error.message}`, true);
            return null;
        }
    }
    decompress(data, context) {
        if (!data)
            return null;
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
    async callHandler(page, handler, data = {}) {
        try {
            const url = `${page}?handler=${handler}`;
            this.log(`📡 Calling Handler: ${handler} on ${page}`);
            const formData = new URLSearchParams();
            if (this.xsrfToken) {
                formData.append('__RequestVerificationToken', this.xsrfToken);
            }
            const dataLogs = [];
            for (const key in data) {
                const val = String(data[key]);
                formData.append(key, val);
                dataLogs.push(`${key}=${val}`);
            }
            this.log(`   🔸 Payload: ${dataLogs.join(', ')}`);
            const response = await this.axiosInstance.post(url, formData, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const result = this.decompress(response.data);
            if (result) {
                let dataItems = [];
                if (Array.isArray(result)) {
                    dataItems = result;
                }
                else if (result && typeof result === 'object') {
                    const possible = result.Table || result.data || result.Data || result.Items || result.Table1 || null;
                    if (Array.isArray(possible)) {
                        dataItems = possible;
                    }
                    else if (possible && typeof possible === 'object' && possible !== null) {
                        const keys = Object.keys(possible);
                        if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
                            dataItems = Object.values(possible);
                        }
                    }
                    if (dataItems.length === 0) {
                        const keys = Object.keys(result);
                        if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
                            dataItems = Object.values(result);
                        }
                    }
                }
                const rowCount = dataItems.length;
                this.log(`  ✅ [${handler}] Nhận được ${rowCount} bản ghi`);
                if (rowCount === 0 && result && typeof result === 'object' && !Array.isArray(result)) {
                    const keys = Object.keys(result);
                    if (keys.length > 0) {
                        this.log(`   🔸 Cấu trúc JSON: { ${keys.slice(0, 5).join(', ')} ... }`);
                    }
                }
            }
            else {
                this.log(`  ⚠️ [${handler}] Response rỗng`);
            }
            return result;
        }
        catch (error) {
            this.log(`❌ Lỗi gọi handler ${handler}: ${error.message}`, true);
            return null;
        }
    }
    async callApi(endpoint, data = {}) {
        try {
            this.log(`📡 Calling API: ${endpoint}`);
            const response = await this.axiosInstance.post(endpoint, data, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const result = this.decompress(response.data);
            this.log(`  ✅ [${endpoint}] Gọi thành công`);
            return result;
        }
        catch (error) {
            this.log(`❌ Lỗi gọi API ${endpoint}: ${error.message}`, true);
            return null;
        }
    }
    async fetchExtensions() {
        this.logger.log('📞 Fetching Extensions...');
        if (!this.xsrfToken)
            await this.getXsrfToken();
        return this.callHandler('/Marketing/TicketExtensionList/', 'LoadData', {});
    }
    async fetchTicketGroups() {
        this.logger.log('👥 Fetching Ticket Groups...');
        if (!this.xsrfToken)
            await this.getXsrfToken();
        return this.callHandler('/Marketing/TicketGroupList/', 'LoadData', {});
    }
};
exports.VttechApiService = VttechApiService;
exports.VttechApiService = VttechApiService = VttechApiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], VttechApiService);
//# sourceMappingURL=vttech-api.service.js.map