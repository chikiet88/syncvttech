
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as zlib from 'zlib';
import * as cheerio from 'cheerio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VttechApiService {
  private readonly logger = new Logger(VttechApiService.name);
  private axiosInstance: AxiosInstance;
  private token: string | null = null;
  private xsrfToken: string | null = null;
  private cookies: string[] = [];
  private logCallback?: (msg: string) => void;

  constructor(private configService: ConfigService) {
    this.axiosInstance = axios.create({
      baseURL: this.configService.get<string>('VTTECH_BASE_URL', 'https://tmtaza.vttechsolution.com'),
      withCredentials: true,
    });
  }

  setLogCallback(callback: (msg: string) => void) {
    this.logCallback = callback;
  }

  private log(msg: string, isError: boolean = false) {
    if (isError) {
      this.logger.error(msg);
    } else {
      this.logger.log(msg);
    }
    if (this.logCallback) {
      this.logCallback(msg);
    }
  }

  private updateCookies(newCookies: string[] | undefined) {
    if (!newCookies) return;
    
    // Merge new cookies with existing ones
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
    const username = this.configService.get<string>('VTTECH_USERNAME');
    const password = this.configService.get<string>('VTTECH_PASSWORD');

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
    } catch (error) {
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
      this.xsrfToken = $('input[name="__RequestVerificationToken"]').val() as string;
      if (this.xsrfToken) {
        this.log('✅ Đã lấy XSRF Token thành công');
      } else {
        this.log('⚠️ Không tìm thấy XSRF Token trong trang');
      }
      return this.xsrfToken;
    } catch (error) {
      this.log(`❌ Lỗi lấy XSRF Token: ${error.message}`, true);
      return null;
    }
  }

  decompress(data: string, context?: string): any {
    if (!data) return null;
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
      try {
        return JSON.parse(data);
      } catch (e) {
        return data;
      }
    }
  }

  async callHandler(page: string, handler: string, data: any = {}) {
    try {
      const url = `${page}?handler=${handler}`;
      this.log(`📡 Calling Handler: ${handler} on ${page}`);
      
      const formData = new URLSearchParams();
      if (this.xsrfToken) {
        formData.append('__RequestVerificationToken', this.xsrfToken);
      }
      const dataLogs: string[] = [];
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
        let dataItems: any[] = [];
        if (Array.isArray(result)) {
          dataItems = result;
        } else if (result && typeof result === 'object') {
          // Check common properties that might be arrays or numeric-keyed objects
          const possible = result.Table || result.data || result.Data || result.Items || result.Table1 || null;
          
          if (Array.isArray(possible)) {
            dataItems = possible;
          } else if (possible && typeof possible === 'object' && possible !== null) {
            const keys = Object.keys(possible);
            if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
              dataItems = Object.values(possible);
            }
          }
          
          // If still no items, check if the result itself has numeric keys
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
      } else {
        this.log(`  ⚠️ [${handler}] Response rỗng`);
      }
      return result;
    } catch (error) {
      this.log(`❌ Lỗi gọi handler ${handler}: ${error.message}`, true);
      return null;
    }
  }

  async callApi(endpoint: string, data: any = {}) {
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
    } catch (error) {
      this.log(`❌ Lỗi gọi API ${endpoint}: ${error.message}`, true);
      return null;
    }
  }

  async fetchExtensions() {
    this.logger.log('📞 Fetching Extensions...');
    if (!this.xsrfToken) await this.getXsrfToken();
    return this.callHandler('/Marketing/TicketExtensionList/', 'LoadData', {});
  }

  async fetchTicketGroups() {
    this.logger.log('👥 Fetching Ticket Groups...');
    if (!this.xsrfToken) await this.getXsrfToken();
    return this.callHandler('/Marketing/TicketGroupList/', 'LoadData', {});
  }

  async getRevenueByBranch(dateFrom: string, dateTo: string, branchId: number) {
    if (!this.xsrfToken) await this.getXsrfToken();
    
    // Format YYYY-MM-DD -> DD-MM-YYYY
    const formatDate = (s: string) => {
      const [y, m, d] = s.split('-');
      return `${d}-${m}-${y}`;
    };

    return this.callHandler(
      '/Report/Revenue/Branch/AllBranchGrid/',
      'LoadataDetailByBranch',
      {
        branchID: branchId,
        dateFrom: formatDate(dateFrom),
        dateTo: formatDate(dateTo),
      }
    );
  }
}
