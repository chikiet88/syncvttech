import axios from 'axios';
import * as cheerio from 'cheerio';

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

  const reqHeaders: any = {
    'Cookie': cookies.join('; '),
    'User-Agent': 'Mozilla/5.0',
    'Accept': '*/*',
    'Referer': `${baseUrl}/Setting/SettingListParam?slug=nguon-khach-hang`,
    'X-Requested-With': 'XMLHttpRequest'
  };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  if (secretKey) reqHeaders['secretkey'] = secretKey;
  if (xsrfToken) {
    reqHeaders['xsrf-token'] = xsrfToken;
    reqHeaders['RequestVerificationToken'] = xsrfToken;
  }

  // Call LoadList
  const loadListRes = await axios.post(`${baseUrl}/Setting/SettingListParam/?handler=LoadList`, {}, {
    headers: reqHeaders
  });

  console.log('LoadList status:', loadListRes.status);
  const items = loadListRes.data;
  console.log('LoadList type:', typeof items, 'length:', Array.isArray(items) ? items.length : 'not array');

  if (Array.isArray(items)) {
    console.log('Sample items:');
    items.forEach((item: any) => {
      if (item.ListText?.toLowerCase().includes('nguon') || item.ListText?.toLowerCase().includes('khach')) {
        console.log(item);
      }
    });

    // Write all items to JSON
    await Bun.write('scratch/setting_param_list.json', JSON.stringify(items, null, 2));
    console.log('Saved scratch/setting_param_list.json');
  } else {
    console.log('LoadList data:', items);
  }
}

main().catch(console.error);
