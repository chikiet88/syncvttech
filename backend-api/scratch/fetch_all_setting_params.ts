import axios from 'axios';
import * as cheerio from 'cheerio';
import * as zlib from 'zlib';

function decompress(data: any): any {
  if (!data || typeof data !== 'string') return data;
  try {
    const clean = data.replace(/^"|"$/g, '');
    const buf = Buffer.from(clean, 'base64');
    try { return JSON.parse(zlib.gunzipSync(buf).toString('utf-8')); }
    catch { try { return JSON.parse(zlib.inflateSync(buf).toString('utf-8')); }
    catch { return JSON.parse(zlib.inflateRawSync(buf).toString('utf-8')); } }
  } catch { try { return JSON.parse(data); } catch { return data; } }
}

async function main() {
  const baseUrl = 'https://tmtaza.vttechsolution.com';
  const username = 'ittest1';
  const password = 'ittest1';

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
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html', 'Cookie': cookies.join('; ') }
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
    UserName: username, Password: password, PasswordEnCrypt: "", IP: "", TokenFCM: "", From: "", SSO: "", Lan: "vi", TokenSSO: ""
  }, {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Referer': `${baseUrl}/Login/Login/`,
      'User-Agent': 'Mozilla/5.0',
      'Cookie': cookies.join('; ')
    }
  });

  updateCookies(loginRes.headers['set-cookie']);
  const token = loginRes.data?.Session;
  if (token) {
    for (const cName of ['WebToken', 'Token', 'token']) {
      cookies.push(`${cName}=${token}`);
    }
  }

  // 3. Get setting page to get page-specific XSRF token
  const settingPageRes = await axios.get(`${baseUrl}/setting/settinglistparam?slug=nguon-khach-hang`, {
    headers: {
      'Cookie': cookies.join('; '),
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html',
      'Authorization': `Bearer ${token}`
    }
  });
  updateCookies(settingPageRes.headers['set-cookie']);
  if (typeof settingPageRes.data === 'string') {
    const $ = cheerio.load(settingPageRes.data);
    const formToken = $('input[name="__RequestVerificationToken"]').val() as string;
    if (formToken) xsrfToken = formToken;
  }

  const reqHeaders: any = {
    'Cookie': cookies.join('; '),
    'User-Agent': 'Mozilla/5.0',
    'Accept': '*/*',
    'Referer': `${baseUrl}/setting/settinglistparam?slug=nguon-khach-hang`,
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
  };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  if (secretKey) reqHeaders['secretkey'] = secretKey;
  if (xsrfToken) {
    reqHeaders['xsrf-token'] = xsrfToken;
    reqHeaders['RequestVerificationToken'] = xsrfToken;
  }

  console.log('XSRF Token:', xsrfToken ? 'YES' : 'NO');

  // Call LoadList
  const formBody = new URLSearchParams();
  if (xsrfToken) formBody.append('__RequestVerificationToken', xsrfToken);

  const loadListRes = await axios.post(`${baseUrl}/Setting/SettingListParam/?handler=LoadList`, formBody.toString(), {
    headers: reqHeaders
  });

  console.log('LoadList status:', loadListRes.status);
  const decompressed = decompress(loadListRes.data);
  console.log('Decompressed LoadList result type:', typeof decompressed, Array.isArray(decompressed) ? decompressed.length : '');

  if (Array.isArray(decompressed)) {
    await Bun.write('scratch/setting_list.json', JSON.stringify(decompressed, null, 2));
    console.log('Saved scratch/setting_list.json');

    const customerSourceTab = decompressed.find((item: any) =>
      item.ListText?.toLowerCase().includes('nguon') || item.ListLink?.toLowerCase().includes('source')
    );
    console.log('Customer Source Tab item in setting list:', customerSourceTab);
  } else {
    console.log('Raw output preview:', String(loadListRes.data).substring(0, 500));
  }
}

main().catch(console.error);
