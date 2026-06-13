import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as cheerio from 'cheerio';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  const s = (vttechApi as any).sessions[0];
  console.log(`Diagnosing login for user: ${s.username}`);

  const axiosInstance = (vttechApi as any).axiosInstance;
  const baseUrl = (vttechApi as any).baseUrl;

  async function followRedirects(method: 'get' | 'post', url: string, config?: any) {
    let currentUrl = url;
    let currentMethod = method;
    let hops = 0;

    while (hops <= 5) {
      console.log(`[Hop ${hops}] Sending ${currentMethod.toUpperCase()} to ${currentUrl}...`);
      const start = Date.now();
      try {
        const resp = currentMethod === 'get'
          ? await axiosInstance.get(currentUrl, { ...config, session: s })
          : await axiosInstance.post(currentUrl, config?.data, { ...config, session: s });
        
        console.log(`[Hop ${hops}] Response status: ${resp.status} in ${Date.now() - start}ms`);
        if (resp.headers['set-cookie']) {
          console.log(`[Hop ${hops}] Cookies set:`, resp.headers['set-cookie']);
        }

        if (resp.status >= 300 && resp.status < 400) {
          const location = resp.headers['location'];
          console.log(`[Hop ${hops}] Redirect location: ${location}`);
          if (location === currentUrl || (location && location.endsWith(currentUrl))) {
            console.log(`[Hop ${hops}] Redirect loop detected, stopping.`);
            return resp;
          }
          currentUrl = location || '';
          currentMethod = 'get';
          hops++;
        } else {
          return resp;
        }
      } catch (err: any) {
        console.error(`[Hop ${hops}] Error: ${err.message} in ${Date.now() - start}ms`);
        throw err;
      }
    }
    throw new Error('Too many redirects');
  }

  try {
    console.log('--- Step 1: followRedirects to /Login/Login ---');
    const loginPageRes = await followRedirects('get', '/Login/Login?ver=' + Date.now(), {
      headers: { 'Accept': 'text/html' },
      timeout: 12000
    });

    console.log('--- Step 2: Extracting tokens ---');
    let secretKey = '';
    let xsrfToken = '';
    if (typeof loginPageRes.data === 'string') {
      const $ = cheerio.load(loginPageRes.data);
      const scriptContent = $('script').map((_, el) => $(el).html()).get().join('\n');
      const skMatch = scriptContent.match(/sys_SecretKey\s*=\s*['"]([^'"]+)['"]/i) || 
                      scriptContent.match(/SecretKey\s*[:=]\s*['"]([^'"]+)['"]/i);
      if (skMatch && skMatch[1]) {
        secretKey = skMatch[1];
        console.log(`Extracted sys_SecretKey: ${secretKey}`);
      }

      const formToken = $('input[name="__RequestVerificationToken"]').val() as string;
      if (formToken) {
        xsrfToken = formToken;
        console.log(`Extracted __RequestVerificationToken: ${xsrfToken}`);
      }
    }

    console.log('--- Step 3: API Login ---');
    const loginPayload = {
      UserName: s.username, Password: s.password, PasswordEnCrypt: "",
      IP: "", TokenFCM: "", From: "", SSO: "", Lan: "vi", TokenSSO: ""
    };
    
    console.log('Sending POST to /api/Author/Login...');
    const startPost = Date.now();
    const loginRes = await axiosInstance.post('/api/Author/Login', loginPayload, {
      headers: { 'Content-Type': 'application/json; charset=UTF-8', 'Referer': baseUrl + '/Login/Login/' },
      session: s,
      timeout: 12000
    } as any);
    console.log(`POST /api/Author/Login status: ${loginRes.status} in ${Date.now() - startPost}ms`);
    console.log('POST Response data:', loginRes.data);

  } catch (err: any) {
    console.error('Test failed:', err.stack);
  }

  await app.close();
}

main().catch(console.error);
