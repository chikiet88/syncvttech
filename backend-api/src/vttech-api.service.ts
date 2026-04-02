import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
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
  private baseUrl: string;
  private loginPromise: Promise<boolean> | null = null;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('VTTECH_BASE_URL', 'https://tmtaza.vttechsolution.com');

    // CRITICAL: maxRedirects: 0 — we handle redirects manually to capture cookies
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      maxRedirects: 0,
      validateStatus: () => true, // Accept ALL status codes so redirects don't throw
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
      }
    });

    // Request interceptor: inject cookies + tokens
    this.axiosInstance.interceptors.request.use(config => {
      const headers: any = config.headers || {};
      const ck = [...this.cookies];
      if (this.token && !ck.some(c => c.startsWith('WebToken='))) ck.push(`WebToken=${this.token}`);
      if (ck.length > 0) headers['Cookie'] = ck.join('; ');
      if (this.token && (config.url?.startsWith('/api/') || config.url?.startsWith('api/'))) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      if (this.secretKey) headers['secretkey'] = this.secretKey;
      if (this.xsrfToken) headers['xsrf-token'] = this.xsrfToken;
      headers['X-Requested-With'] = 'XMLHttpRequest';
      
      // DEBUG: Log full request details for handler POST calls
      if (config.method === 'post' && config.url?.includes('handler=')) {
        const cookieNames = ck.map(c => c.split('=')[0]);
        this.logger.log(`🔍 [DEBUG POST] URL: ${config.url}`);
        this.logger.log(`🔍 [DEBUG POST] Cookie keys: ${cookieNames.join(', ')}`);
        this.logger.log(`🔍 [DEBUG POST] secretkey: ${headers['secretkey'] ? 'YES' : 'HOÀN HẢO_HIDDEN'}`);
      }

      config.headers = headers;
      return config;
    });

    // Response interceptor: capture cookies from EVERY response
    this.axiosInstance.interceptors.response.use(response => {
      this.updateCookies(response.headers['set-cookie']);
      return response;
    });
  }

  private log(msg: string) {
    this.logger.log(msg);
    if (this.logCallback) this.logCallback(msg);
  }

  private updateCookies(newCookies: string[] | undefined) {
    if (!newCookies) return;
    for (const raw of newCookies) {
      const firstPart = raw.split(';')[0];
      const name = firstPart.split('=')[0];
      this.cookies = this.cookies.filter(c => !c.startsWith(name + '='));
      this.cookies.push(firstPart);
    }
  }

  private ensureCookie(name: string, value: string) {
    if (!this.cookies.some(c => c.startsWith(name + '='))) {
      this.cookies.push(`${name}=${value}`);
    }
  }

  /**
   * Follow redirects manually, capturing Set-Cookie at every hop.
   * This is the KEY fix — Axios's auto-redirect loses intermediate cookies.
   */
  private async followRedirects(
    method: 'get' | 'post',
    url: string,
    config?: AxiosRequestConfig,
    maxHops = 5
  ) {
    let currentUrl = url;
    let currentMethod = method;
    let hops = 0;

    while (hops <= maxHops) {
      const resp = currentMethod === 'get'
        ? await this.axiosInstance.get(currentUrl, config)
        : await this.axiosInstance.post(currentUrl, config?.data, config);

      // Not a redirect — return final response
      if (resp.status < 300 || resp.status >= 400) return resp;

      // Redirect — capture cookies (already done by interceptor) and follow
      const location = resp.headers['location'];
      if (!location) return resp;

      currentUrl = location.startsWith('http') ? location : location;
      currentMethod = 'get'; // Redirects become GET
      config = { ...config, data: undefined };
      hops++;
    }
    throw new Error('Too many redirects');
  }

  async login(force = false): Promise<boolean> {
    if (this.token && this.cookies.some(c => c.startsWith('.AspNetCore.Session=')) && !force) return true;
    if (this.loginPromise) return this.loginPromise;

    this.loginPromise = (async () => {
      try {
        const username = this.configService.get<string>('VTTECH_USERNAME');
        const password = this.configService.get<string>('VTTECH_PASSWORD');
        if (force) { this.token = null; this.cookies = []; this.xsrfToken = null; }

        // Step 1: GET login page — sets .AspNetCore.Antiforgery cookie + XSRF token
        const loginPageRes = await this.followRedirects('get', '/Login/Login?ver=' + Date.now(), {
          headers: { 'Accept': 'text/html' }
        });
        if (typeof loginPageRes.data === 'string') {
          const $ = cheerio.load(loginPageRes.data);
          const formToken = $('input[name="__RequestVerificationToken"]').val() as string;
          if (formToken) {
            this.xsrfToken = formToken;
            this.log(`🔑 XSRF Token từ trang Login: ${formToken.slice(0, 20)}...`);
          }
        }

        // Add standard browser cookies matching the trace
        this.ensureCookie('.AspNetCore.Culture', 'c%3Den-US%7Cuic%3Dvi');
        this.ensureCookie('VTTECH_Menu_SideBarIsHide', 'false');

        // Step 2: Get encrypted IP
        const ipRes = await this.axiosInstance.post('/api/Author/GetIP', {}, {
          headers: { 'Content-Type': 'application/json' }
        });
        const ip_encry = ipRes.data?.ip_encry || "";

        // Step 3: AJAX Login
        const loginPayload = {
          UserName: username, Password: password, PasswordEnCrypt: "",
          IP: ip_encry, TokenFCM: "", From: "", SSO: "", Lan: "vi", TokenSSO: ""
        };
        const loginRes = await this.axiosInstance.post('/api/Author/Login', loginPayload, {
          headers: { 'Content-Type': 'application/json; charset=UTF-8', 'Referer': this.baseUrl + '/Login/Login/' }
        });

        const data = loginRes.data;
        this.log(`🔍 [LOGIN RESPONSE] Keys: ${JSON.stringify(Object.keys(data || {}))}`);
        this.log(`🔍 [LOGIN RESPONSE] SettingUser: ${JSON.stringify(data?.SettingUser)?.slice(0, 200)}`);
        this.log(`🔍 [LOGIN RESPONSE] PasswordEnCrypt: ${data?.PasswordEnCrypt?.slice(0, 50)}`);
        this.log(`🔍 [LOGIN RESPONSE] UserExtraConfig: ${JSON.stringify(data?.UserExtraConfig)?.slice(0, 200)}`);
        if (data && data.Session) {
          this.token = data.Session;
          // Sử dụng SecretKey từ Login HOẶC dùng Fallback Key đã chẩn đoán thành công
          this.secretKey = data.SecretKey || data.secretkey || data.Secretkey || 'vvjeUfMxJcm2aB0fl2ySxsiqGj5X5X3SY3Dl6Qj2te0SouYCtVRKC7qcp/MiP16aD5iQLEfgAsDk/ERxed+eUbi8eaY7/mraxUcfGqobMu4=';
          this.log(`✅ Login OK. JWT: ${this.token!.slice(0, 20)}... | SecretKey: ${this.secretKey ? 'SET OK' : 'NO'}`);

          // Step 4: Activate session — visit dashboard (follow redirects, capture cookies)
          await this.followRedirects('get', '/Index/', { headers: { 'Accept': 'text/html' } });

          // Step 5: Visit report page to get fresh XSRF token for report handlers
          const reportPageRes = await this.followRedirects('get', '/report/reportgeneral/', {
            headers: { 'Accept': 'text/html', 'Referer': this.baseUrl + '/' }
          });
          if (typeof reportPageRes.data === 'string' && !reportPageRes.data.trim().startsWith('<script>')) {
            const $ = cheerio.load(reportPageRes.data);
            const rToken = $('input[name="__RequestVerificationToken"]').val() as string;
            if (rToken) {
              this.xsrfToken = rToken;
              this.log(`🔑 XSRF Token từ Report page: ${rToken.slice(0, 20)}...`);
            }
          }

          // Debug: log all cookies we have
          const cookieNames = this.cookies.map(c => c.split('=')[0]);
          this.log(`🍪 Cookies (${cookieNames.length}): ${cookieNames.join(', ')}`);
          const hasAntiforgery = cookieNames.some(n => n.includes('Antiforgery'));
          this.log(`🛡️ Antiforgery cookie: ${hasAntiforgery ? '✅ CÓ' : '❌ THIẾU'}`);

          return true;
        }
        this.log(`❌ Login failed: No Session in response`);
        return false;
      } catch (error) {
        this.log(`❌ Lỗi LOGIN: ${error.message}`);
        return false;
      } finally { this.loginPromise = null; }
    })();
    return this.loginPromise;
  }

  async getXsrfToken(page = '/Customer/ListCustomer/', force = false) {
    if (!force && this.xsrfToken) return this.xsrfToken;
    try {
      const resp = await this.followRedirects('get', page, {
        headers: { 'Referer': this.baseUrl + '/', 'Accept': 'text/html' }
      });
      if (typeof resp.data === 'string') {
        const $ = cheerio.load(resp.data);
        const token = $('input[name="__RequestVerificationToken"]').val() as string;
        if (token) { this.xsrfToken = token; return token; }
      }
      return this.xsrfToken;
    } catch { return this.xsrfToken; }
  }

  decompress(data: any): any {
    if (!data || typeof data !== 'string') return data;
    try {
      const clean = data.replace(/^"|"$/g, '');
      const buf = Buffer.from(clean, 'base64');
      try { return JSON.parse(zlib.gunzipSync(buf).toString('utf-8')); }
      catch { try { return JSON.parse(zlib.inflateSync(buf).toString('utf-8')); }
      catch { return JSON.parse(zlib.inflateRawSync(buf).toString('utf-8')); } }
    } catch { try { return JSON.parse(data); } catch { return data; } }
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return dateStr;
    const d = dateStr.split(' ')[0];
    const p = d.split('-');
    if (p.length === 3 && p[0].length === 4) return `${p[2]}-${p[1]}-${p[0]}`;
    return d;
  }

  /**
   * Build a clean form body: ONLY data params, NO __RequestVerificationToken, NO handler.
   * The browser trace (content-length: 48) proves body = "dateFrom=01-04-2026&dateTo=30-04-2026&branchID=7"
   * XSRF validation is done via the xsrf-token HEADER only (ASP.NET Core AJAX mode).
   */
  private buildFormBody(data: any, page?: string): URLSearchParams {
    const form = new URLSearchParams();
    const processed = { ...data };
    
    // Portal VTTech có 2 định dạng ngày tùy Handler:
    // 1. Report (Revenue/AllBranchGrid): DD-MM-YYYY
    // 2. Customer List (ListCustomer): YYYY-MM-DD HH:mm:ss
    const isCustomerPage = page?.includes('/Customer/ListCustomer/');

    for (const k of ['dateFrom', 'dateTo', 'DateFrom', 'DateTo']) {
      if (processed[k]) {
        if (isCustomerPage) {
          // Giữ nguyên YYYY-MM-DD và đảm bảo có HH:mm:ss như capture thực tế
          if (typeof processed[k] === 'string' && !processed[k].includes(':')) {
            processed[k] = `${processed[k].split(' ')[0]} 00:00:00`;
          }
        } else {
          processed[k] = this.formatDate(processed[k]);
        }
      }
    }
    Object.keys(processed).forEach(k => form.append(k, String(processed[k])));
    return form;
  }

  private handlerHeaders(page?: string) {
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

  async callHandler(page: string, handler: string, data: any) {
    await this.login();
    const url = `${page}?handler=${handler}`;
    const formBody = this.buildFormBody(data, page);

    this.log(`📡 [API CALL] ${handler} | ${page} | body=${formBody.toString().slice(0, 80)}`);

    const response = await this.axiosInstance.post(url, formBody, {
      headers: this.handlerHeaders(page),
    });

    // 302 = session rejected → re-login and retry once
    if (response.status >= 300 && response.status < 400) {
      this.log(`⚠️ [REDIRECT ${response.status}] ${handler} → ${response.headers['location']}`);
      this.log(`🔄 Re-login và thử lại...`);
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

    // Handle HTML response (200 but HTML content = SPA redirect)
    if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      this.log(`⚠️ [HTML] ${handler}: Got HTML instead of data (status ${response.status})`);
      return [];
    }

    const decompressed = this.decompress(response.data);
    const count = Array.isArray(decompressed) ? decompressed.length : (decompressed?.Table?.length || 0);
    this.log(`📥 [API RESPONSE] ${handler}: ${count} recs.`);
    return decompressed;
  }

  async callApi(url: string, data: any) {
    await this.login();
    this.log(`📡 [API CALL] API: ${url}`);
    const resp = await this.axiosInstance.post(url, data);
    if (resp.status >= 400) throw new Error(`API error: ${resp.status}`);
    this.log(`📥 [API RESPONSE] ${url}: OK`);
    return resp.data;
  }

  async fetchExtensions() { return this.callHandler('/marketing/ticketgeneral/', 'LoadIni', {}); }
  async fetchTicketGroups() { const r = await this.callHandler('/marketing/ticketgeneral/', 'LoadIni', {}); return r?.TicketGroups || []; }
  async fetchCallHistory(dateFrom: string, dateTo: string) {
    return this.callHandler('/marketing/call/historycall/', 'LoadData', {
      DateFrom: dateFrom, DateTo: dateTo, BranchID: 0, Type: 0
    });
  }

  private logCallback: ((msg: string) => void) | null = null;
  setLogCallback(cb: (msg: string) => void) { this.logCallback = cb; }

  async getRevenueByBranch(dateFrom: string, dateTo: string, branchId: number) {
    return this.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'Loadata', {
      branchID: branchId.toString(), dateFrom, dateTo
    });
  }
}
