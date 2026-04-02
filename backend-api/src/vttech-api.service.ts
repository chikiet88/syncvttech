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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': this.baseUrl,
        'X-Requested-With': 'XMLHttpRequest',
      }
    });

    // Simple interceptor to add headers
    this.axiosInstance.interceptors.request.use(config => {
      // Common headers
      const headers: any = config.headers || {};
      
      if (this.cookies.length > 0) {
        headers['Cookie'] = this.cookies.join('; ');
      }

      // VTTech portal primarily uses cookies and custom headers, but API still needs Authorization
      if (this.token && config.url?.startsWith('/api/')) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      
      if (this.secretKey) {
        headers['secretkey'] = this.secretKey;
      }

      if (this.xsrfToken) {
        headers['xsrf-token'] = this.xsrfToken;
      }
      
      headers['user-agent'] = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      headers['accept'] = 'application/json, text/javascript, */*; q=0.01';
      headers['accept-language'] = 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7';
      headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
      headers['sec-ch-ua-mobile'] = '?0';
      headers['sec-ch-ua-platform'] = '"Linux"';
      headers['sec-fetch-dest'] = 'empty';
      headers['sec-fetch-mode'] = 'cors';
      headers['sec-fetch-site'] = 'same-origin';
      headers['x-requested-with'] = 'XMLHttpRequest';

      config.headers = headers;
      return config;
    });
  }

  private log(msg: string) {
    this.logger.log(msg);
  }

  private updateCookies(newCookies: string[] | undefined) {
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

  async login(force = false): Promise<boolean> {
    if (this.token && !force) return true;
    if (this.loginPromise) return this.loginPromise;

    this.loginPromise = (async () => {
      try {
        this.log('🔐 Đang đăng nhập VTTech bằng Form mechanism...');
        const username = this.configService.get<string>('VTTECH_USERNAME');
        const password = this.configService.get<string>('VTTECH_PASSWORD');

        // 1. Lấy trang Login để trích xuất IP Token động
        // Theo browser subagent, trang login ở /Login/Login/
        const loginPageResponse = await this.axiosInstance.get('/Login/Login/');
        this.updateCookies(loginPageResponse.headers['set-cookie']);
        
        // Tìm IP Token bằng Regex (thường là chuỗi base64 dài kết thúc bằng =)
        const ipTokenMatch = loginPageResponse.data.match(/[a-zA-Z0-9+/]{40,}=/);
        // Hardcoded IP token from a known successful browser session (often static for the portal version)
        const ipToken = ipTokenMatch ? ipTokenMatch[0] : 'JLYxMl2Tcnfvfg10lGR3eFj9RqdxiUv8yqkI1bVUAsg=';
        
        this.log(`📡 Sử dụng IP Token: ${ipToken.slice(0, 10)}...`);

        // 2. Post tới login API với đúng các trường (PascalCase và IP field)
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
          // Thêm WebToken cookie cho các trang portal
          this.cookies = this.cookies.filter(c => !c.startsWith('WebToken='));
          
          // 3. Truy cập trang chủ và trang đích redirect để xác thực session đầy đủ
          try {
            const username = this.configService.get<string>('VTTECH_USERNAME') || '';
            const password = this.configService.get<string>('VTTECH_PASSWORD') || '';
            if (!username || !password) {
              this.log('❌ Thiếu VTTECH_USERNAME hoặc VTTECH_PASSWORD trong .env');
              return false;
            }

            const formData = new URLSearchParams();
            formData.append('UserName', username);
            formData.append('Password', password);
            formData.append('IPToken', ipToken);

            const loginRes = await this.axiosInstance.post('/Login/Login', formData, {
              maxRedirects: 0,
              validateStatus: (status) => status >= 200 && status < 400,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': this.baseUrl + '/Login/Login',
              },
            });
  
            this.updateCookies(loginRes.headers['set-cookie']);
            
            if (loginRes.status >= 300 && loginRes.status < 400) {
              const redirectUrl = loginRes.headers['location'];
              if (redirectUrl) {
                const followRes = await this.axiosInstance.get(redirectUrl);
                this.updateCookies(followRes.headers['set-cookie']);
                this.log(`🏠 Đã thiết lập Session portal (Redirect followed: ${redirectUrl})`);
              }
            }

            // Step 3: Visit Index to fully establish session
            try {
              const indexRes = await this.axiosInstance.get('/Index/');
              this.updateCookies(indexRes.headers['set-cookie']);
            } catch (e) {}

            this.cookies = this.cookies.filter(c => !c.startsWith('WebToken='));
            this.cookies.push(`WebToken=${this.token}`);
            this.log('✅ Đăng nhập thành công (Form mode - Manual Redirect)');
            return true;
          } catch (e) {
              this.log(`⚠️ Lỗi khi establish session portal: ${e.message}`);
          }

          return true;
        }
        this.log(`❌ Đăng nhập thất bại: ${JSON.stringify(response.data)}`);
        return false;
      } catch (error) {
        this.log(`❌ Lỗi đăng nhập: ${error.message}`);
        return false;
      } finally {
        this.loginPromise = null;
      }
    })();

    return this.loginPromise;
  }

  async getXsrfToken(page = '/Customer/ListCustomer/', force = false) {
    // Check cache first
    if (!force && this.pageTokens.has(page)) {
      return this.pageTokens.get(page);
    }

    try {
      this.log(`📡 Đang lấy XSRF Token cho trang ${page}...`);
      const response = await this.axiosInstance.get(page);
      this.updateCookies(response.headers['set-cookie']);
      
      const $ = cheerio.load(response.data);
      const token = $('input[name="__RequestVerificationToken"]').val() as string;
      
      if (token) {
        this.pageTokens.set(page, token);
        this.xsrfToken = token; // Cập nhật token global fallback
        this.log(`✅ Đã lấy XSRF Token cho ${page}: ${token.slice(0, 10)}...`);
        return token;
      } else {
        // Nếu không có token riêng cho trang này, dùng fallback global đã cache
        if (this.xsrfToken) {
          this.log(`⚠️ Không tìm thấy Token trên ${page}, sử dụng fallback token hiện có.`);
          return this.xsrfToken;
        }

        // Nếu nhận về HTML nhưng không thấy token, có thể là trang login
        if (typeof response.data === 'string' && response.data.includes('/Login/Login')) {
          this.log(`⚠️ Session hết hạn (redirected to login) khi truy cập ${page}.}`);
          this.token = null;
          this.pageTokens.clear();
        } else {
          this.log(`⚠️ Không tìm thấy XSRF Token trong trang ${page} và không có fallback.`);
        }
      }
    } catch (error) {
      this.log(`❌ Lỗi lấy XSRF Token cho ${page}: ${error.message}`);
      if (this.xsrfToken) {
        this.log(`   🔸 Sử dụng lại fallback token cũ do lỗi kết nối.`);
        return this.xsrfToken;
      }
    }
    return this.pageTokens.get(page) || this.xsrfToken || null;
  }


  decompress(data: any): any {
    if (!data) return null;
    if (typeof data !== 'string') return data;
    
    try {
      const cleanData = data.replace(/^"|"$/g, '');
      const buffer = Buffer.from(cleanData, 'base64');
      try {
        const decompressed = zlib.gunzipSync(buffer);
        return JSON.parse(decompressed.toString('utf-8'));
      } catch (e) {
        try {
          const decompressed = zlib.inflateSync(buffer);
          return JSON.parse(decompressed.toString('utf-8'));
        } catch (e2) {
          const decompressed = zlib.inflateRawSync(buffer);
          return JSON.parse(decompressed.toString('utf-8'));
        }
      }
    } catch (error) {
      try { return JSON.parse(data); } catch (e) { return data; }
    }
  }

  async callHandler(page: string, handler: string, data: any) {
    try {
      // Chờ một chút để tránh Rate Limit (20 req/min)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await this.login();
      
      const token = await this.getXsrfToken(page);
      if (!token) {
        this.log(`❌ Không thể thực hiện ${handler} vì thiếu XSRF Token cho trang ${page}`);
        return undefined;
      }
      
      const url = `${page}?handler=${handler}`;
      const formData = new URLSearchParams();
      
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });

      const response = await this.axiosInstance.post(url, formData, {
        headers: {
          'x-requested-with': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': this.baseUrl + page,
          'xsrf-token': token,
        },
      });

      if (typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE')) {
          this.log(`⚠️  [${handler}] Nhận về HTML thay vì dữ liệu. Có thể do handler sai hoặc session hết hạn.`);
      }

      this.log(`   🔸 [${handler}] Response sample: ${String(response.data).slice(0, 100)}`);
      const result = this.decompress(response.data);
      return result;
    } catch (error) {
      this.log(`❌ Lỗi gọi Handler ${handler} trên ${page}: ${error.message}`);
      if (error.response?.status === 401) {
          this.token = null; // Force re-login next time
      }
      throw error;
    }
  }

  async callApi(url: string, data: any) {
    try {
      await this.login();
      const response = await this.axiosInstance.post(url, data);
      return response.data;
    } catch (e) {
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

  async fetchCallHistory(dateFrom: string, dateTo: string) {
    const formatDate = (s: string) => {
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

  private logCallback: ((msg: string) => void) | null = null;
  setLogCallback(callback: (msg: string) => void) {
    this.logCallback = callback;
  }

  async getRevenueByBranch(dateFrom: string, dateTo: string, branchId: number) {
    const formatDate = (s: string) => {
      const [y, m, d] = s.split('-');
      return `${d}-${m}-${y}`;
    };
    return this.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'LoadataDetailByBranch', {
      branchID: branchId.toString(),
      dateFrom: formatDate(dateFrom),
      dateTo: formatDate(dateTo),
    });
  }
}
