import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import * as zlib from 'zlib';

@Injectable()
export class VttechApiService {
  private readonly logger = new Logger(VttechApiService.name);
  private axiosInstance: AxiosInstance;
  private token: string | null = null;
  private secretKey: string | null = null;
  private cookies: string[] = [];
  private xsrfToken: string | null = null;
  private pageTokens: Map<string, string> = new Map();
  private baseUrl: string;
  private loginPromise: Promise<boolean> | null = null;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('VTTECH_BASE_URL', 'https://tmtaza.vttechsolution.com');
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    this.axiosInstance.interceptors.request.use(config => {
      const headers: any = config.headers || {};
      if (this.cookies.length > 0) headers['Cookie'] = this.cookies.join('; ');
      
      // Crucial: Consistent casing based on browser trace
      if (this.token && config.url?.includes('/api/')) headers['Authorization'] = `Bearer ${this.token}`;
      if (this.secretKey) headers['SecretKey'] = this.secretKey;
      if (this.xsrfToken) headers['XSRF-TOKEN'] = this.xsrfToken;
      
      headers['Accept'] = '*/*';
      headers['X-Requested-With'] = 'XMLHttpRequest';
      
      config.headers = headers;
      return config;
    });
  }

  private log(msg: string) {
    this.logger.log(msg);
    if (this.logCallback) this.logCallback(msg);
  }

  private updateCookies(newCookies: string[] | undefined) {
    if (newCookies) {
      newCookies.forEach(newCookie => {
        const firstPart = newCookie.split(';')[0];
        const name = firstPart.split('=')[0];
        this.cookies = this.cookies.filter(c => !c.startsWith(name + '='));
        this.cookies.push(firstPart);
      });
    }
  }

  async login(force = false): Promise<boolean> {
    if (this.token && this.cookies.some(c => c.startsWith('.AspNetCore.Session=')) && !force) return true;
    if (this.loginPromise) return this.loginPromise;

    this.loginPromise = (async () => {
      try {
        this.log('🔐 Khởi động quy trình xác thực High-Fidelity (KataCore 2025)...');
        const username = this.configService.get<string>('VTTECH_USERNAME');
        const password = this.configService.get<string>('VTTECH_PASSWORD');

        const clean = axios.create({
          baseURL: this.baseUrl,
          validateStatus: (s) => s < 500,
          headers: { 
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }
        });

        // Step 1: Initial load
        const p1Res = await clean.get('/Login/Login?ver=' + Date.now());
        this.updateCookies(p1Res.headers['set-cookie']);

        // Step 2: Get IP
        const ipRes = await clean.post('/api/Author/GetIP', {}, {
          headers: { 'Cookie': this.cookies.join('; '), 'Content-Type': 'application/json' }
        });
        const ip_encry = ipRes.data?.ip_encry || "";

        // Step 3: AJAX Login
        const loginPayload = {
          UserName: username, Password: password, PasswordEnCrypt: "",
          IP: ip_encry, TokenFCM: "", From: "", SSO: "", Lan: "vi", TokenSSO: ""
        };

        const loginRes = await clean.post('/api/Author/Login', loginPayload, {
          headers: { 
            'Cookie': this.cookies.join('; '), 
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': this.baseUrl + '/Login/Login/'
          }
        });

        this.updateCookies(loginRes.headers['set-cookie']);
        const data = loginRes.data;

        if (data && data.Session) {
          this.token = data.Session;
          this.secretKey = data.SecretKey;
          this.log(`✅ Đăng nhập AJAX thành công. JWT: ${this.token?.slice(0, 10)}...`);
          
          // Kích hoạt qua Index
          await clean.get('/Index/', { headers: { 'Cookie': this.cookies.join('; ') } });
          return true;
        }

        this.log(`❌ Phản hồi đăng nhập: ${JSON.stringify(data).slice(0, 100)}`);
        return false;
      } catch (error) {
        this.log(`❌ Lỗi login: ${error.message}`);
        return false;
      } finally {
        this.loginPromise = null;
      }
    })();
    return this.loginPromise;
  }

  async getXsrfToken(page = '/Customer/ListCustomer/', force = false) {
    if (!force && this.pageTokens.has(page)) return this.pageTokens.get(page);
    try {
      const response = await this.axiosInstance.get(page, { headers: { 'Referer': this.baseUrl + '/' } });
      this.updateCookies(response.headers['set-cookie']);
      const $ = cheerio.load(response.data);
      const token = $('input[name="__RequestVerificationToken"]').val() as string;
      if (token) {
        this.pageTokens.set(page, token);
        this.xsrfToken = token; // Global fallback
        return token;
      }
      return this.xsrfToken;
    } catch (error) { return this.xsrfToken; }
  }

  decompress(data: any): any {
    if (!data || typeof data !== 'string') return data;
    try {
      const cleanData = data.replace(/^"|"$/g, '');
      const buffer = Buffer.from(cleanData, 'base64');
      try { return JSON.parse(zlib.gunzipSync(buffer).toString('utf-8')); }
      catch (e) {
        try { return JSON.parse(zlib.inflateSync(buffer).toString('utf-8')); }
        catch (e2) { return JSON.parse(zlib.inflateRawSync(buffer).toString('utf-8')); }
      }
    } catch (error) { try { return JSON.parse(data); } catch (e) { return data; } }
  }

  async callHandler(page: string, handler: string, data: any) {
    await this.login();
    const token = await this.getXsrfToken(page);
    const url = `${page}?handler=${handler}`;
    const formData = new URLSearchParams();
    Object.keys(data).forEach(key => formData.append(key, data[key]));

    const response = await this.axiosInstance.post(url, formData, {
      headers: { 
        'XSRF-TOKEN': token, 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': this.baseUrl + page
      },
    });
    return this.decompress(response.data);
  }

  async callApi(url: string, data: any) {
    await this.login();
    const response = await this.axiosInstance.post(url, data);
    return response.data;
  }

  async fetchExtensions() { return this.callHandler('/marketing/ticketgeneral/', 'LoadIni', {}); }
  async fetchTicketGroups() { const res = await this.callHandler('/marketing/ticketgeneral/', 'LoadIni', {}); return res?.TicketGroups || []; }
  async fetchCallHistory(dateFrom: string, dateTo: string) {
    return this.callHandler('/marketing/call/historycall/', 'LoadData', {
        DateFrom: `${dateFrom} 00:00:00`, DateTo: `${dateTo} 23:59:59`, BranchID: 0, Type: 0
    });
  }

  private logCallback: ((msg: string) => void) | null = null;
  setLogCallback(callback: (msg: string) => void) { this.logCallback = callback; }

  async getRevenueByBranch(dateFrom: string, dateTo: string, branchId: number) {
    return this.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'LoadataDetailByBranch', {
      branchID: branchId.toString(), dateFrom: `${dateFrom} 00:00:00`, dateTo: `${dateTo} 23:59:59`,
    });
  }
}
