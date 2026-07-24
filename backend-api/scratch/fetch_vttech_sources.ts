import axios from 'axios';
import * as cheerio from 'cheerio';

async function main() {
  const baseUrl = 'https://tmtaza.vttechsolution.com';
  const username = 'ittest1';
  const password = 'ittest1';

  console.log(`🔑 Logging into ${baseUrl} with user ${username}...`);

  const cookies: string[] = ['.AspNetCore.Culture=c%3Den-US%7Cuic%3Dvi'];

  function updateCookies(setCookieHeader: string[] | undefined) {
    if (!setCookieHeader) return;
    for (const raw of setCookieHeader) {
      const first = raw.split(';')[0];
      const [name] = first.split('=');
      if (!name) continue;
      const idx = cookies.findIndex(c => c.startsWith(name + '='));
      if (idx !== -1) cookies[idx] = first;
      else cookies.push(first);
    }
  }

  // 1. Get Login Page
  const loginPageRes = await axios.get(`${baseUrl}/Login/Login?ver=${Date.now()}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
      'Cookie': cookies.join('; ')
    }
  });
  updateCookies(loginPageRes.headers['set-cookie']);

  let secretKey = '';
  let xsrfToken = '';
  if (typeof loginPageRes.data === 'string') {
    const $ = cheerio.load(loginPageRes.data);
    const scriptContent = $('script').map((_, el) => $(el).html()).get().join('\n');
    const skMatch = scriptContent.match(/sys_SecretKey\s*=\s*['"]([^'"]+)['"]/i) ||
                    scriptContent.match(/SecretKey\s*[:=]\s*['"]([^'"]+)['"]/i);
    if (skMatch && skMatch[1]) secretKey = skMatch[1];
    xsrfToken = ($('input[name="__RequestVerificationToken"]').val() as string) || '';
  }

  // 2. Perform Login
  const loginRes = await axios.post(`${baseUrl}/api/Author/Login`, {
    UserName: username,
    Password: password,
    PasswordEnCrypt: "",
    IP: "", TokenFCM: "", From: "", SSO: "", Lan: "vi", TokenSSO: ""
  }, {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Referer': `${baseUrl}/Login/Login/`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookies.join('; ')
    }
  });

  updateCookies(loginRes.headers['set-cookie']);

  console.log('Login status:', loginRes.status);
  console.log('Login res data:', loginRes.data);

  let token = loginRes.data?.data?.token || loginRes.data?.token || loginRes.data?.Token;
  if (!token && loginRes.data?.token) token = loginRes.data.token;
  if (!token && loginRes.data) {
    if (typeof loginRes.data === 'string' && loginRes.data.includes('"token":"')) {
      const match = loginRes.data.match(/"token"\s*:\s*"([^"]+)"/);
      if (match) token = match[1];
    }
  }

  if (token) {
    for (const cName of ['WebToken', 'Token', 'token']) {
      const cookieStr = `${cName}=${token}`;
      const idx = cookies.findIndex(c => c.startsWith(cName + '='));
      if (idx !== -1) cookies[idx] = cookieStr;
      else cookies.push(cookieStr);
    }
  }

  console.log('Token extracted:', token ? 'YES' : 'NO');
  console.log('Cookies count:', cookies.length);

  // 3. Fetch Setting Page
  const reqHeaders: any = {
    'Cookie': cookies.join('; '),
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': `${baseUrl}/`,
    'X-Requested-With': 'XMLHttpRequest'
  };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  if (secretKey) reqHeaders['secretkey'] = secretKey;
  if (xsrfToken) {
    reqHeaders['xsrf-token'] = xsrfToken;
    reqHeaders['RequestVerificationToken'] = xsrfToken;
  }

  const settingPageUrl = `${baseUrl}/setting/settinglistparam?slug=nguon-khach-hang`;
  console.log(`📡 Fetching ${settingPageUrl}...`);

  const pageRes = await axios.get(settingPageUrl, { headers: reqHeaders });
  console.log('Page fetch status:', pageRes.status);

  if (pageRes.status === 200) {
    const html = pageRes.data;
    console.log('HTML length:', html.length);
    const $ = cheerio.load(html);

    // Save page HTML for analysis
    await Bun.write('scratch/setting_page_dump.html', html);
    console.log('Saved scratch/setting_page_dump.html');

    // Inspect script tags or tables
    console.log('Page title:', $('title').text().trim());

    // Try calling handler endpoints
    console.log('\n--- Testing AJAX Handler calls ---');

    // Try /Setting/SettingListParam/?handler=LoadData
    try {
      const handlerRes1 = await axios.post(`${baseUrl}/Setting/SettingListParam/?handler=LoadData`, {
        slug: 'nguon-khach-hang',
        limit: 500,
        offset: 0
      }, {
        headers: {
          ...reqHeaders,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
      });
      console.log('Handler LoadData status:', handlerRes1.status);
      console.log('Handler LoadData response preview:', JSON.stringify(handlerRes1.data).substring(0, 500));
    } catch (e: any) {
      console.log('Handler LoadData error:', e.message);
    }
  }
}

main().catch(console.error);
