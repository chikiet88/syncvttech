import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VttechApiService } from './vttech-api.service';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

dotenv.config();

async function main() {
  console.log('🚀 Bootstrapping NestJS context for CRM Setting Page Scraping...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  // Define the credentials
  const username = 'CHIKIET';
  const password = '@hikiet88';

  // Create a new session object for this user
  const session: any = {
    username,
    password,
    token: null,
    secretKey: null,
    cookies: [],
    xsrfToken: null,
    lastUsedAt: 0,
    errorCount: 0,
    lastErrorAt: 0,
    loginByUsernamePromise: null,
    lock: null
  };

  try {
    console.log(`🔑 Attempting login for ${username}...`);
    const loggedIn = await vttechApi.login(session, true);
    if (!loggedIn) {
      console.error('❌ Login failed!');
      await app.close();
      return;
    }
    console.log('✅ Login succeeded! Cookies:', session.cookies);

    // Call getXsrfToken to ensure we have xsrf token for pages
    await vttechApi.getXsrfToken(session, '/setting/settinglistparam/?slug=nguon-khach-hang', true);

    // Make the GET request to the setting page
    const pageUrl = `${vttechApi['baseUrl']}/setting/settinglistparam/?slug=nguon-khach-hang`;
    console.log(`📡 Fetching page: ${pageUrl}`);
    
    // Build request headers from session
    const ck = [...session.cookies];
    if (session.token) {
      ck.push(`WebToken=${session.token}`);
      ck.push(`Token=${session.token}`);
      ck.push(`token=${session.token}`);
    }
    const headers: any = {
      'Cookie': ck.join('; '),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Referer': vttechApi['baseUrl'] + '/',
    };
    if (session.secretKey) headers['secretkey'] = session.secretKey;
    if (session.xsrfToken) headers['RequestVerificationToken'] = session.xsrfToken;

    const response = await axios.get(pageUrl, {
      headers,
      validateStatus: () => true
    });

    console.log(`Page status: ${response.status}`);
    if (response.status === 200) {
      fs.writeFileSync('setting_page.html', response.data);
      console.log('Saved setting page HTML to setting_page.html');
      
      const $ = cheerio.load(response.data);
      // Search for any script tags with settings or forms
      console.log('--- Scripts found containing keywords ---');
      $('script').each((i, el) => {
        const text = $(el).html() || '';
        if (text.includes('Save') || text.includes('Detail') || text.includes('insert') || text.includes('update') || text.includes('Param')) {
          console.log(`Script ${i}: contains relevant keywords (length ${text.length})`);
        }
      });
    } else {
      console.error('❌ Failed to fetch page. Body:', response.data.substring(0, 500));
    }
  } catch (e: any) {
    console.error('Error during scraping:', e.message);
  }

  await app.close();
}

main().catch(console.error);
