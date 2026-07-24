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
  const username = 'CHIKIET';
  const password = '@hikiet88';

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
  for (const cName of ['WebToken', 'Token', 'token']) {
    cookies.push(`${cName}=${token}`);
  }

  // 3. GET /Marketing/TicketSourceTypeDetail?CurrentType=62 to get page token
  const pageRes = await axios.get(`${baseUrl}/Marketing/TicketSourceTypeDetail?CurrentType=62&ver=${Date.now()}`, {
    headers: {
      'Cookie': cookies.join('; '),
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html',
      'Authorization': `Bearer ${token}`
    }
  });
  updateCookies(pageRes.headers['set-cookie']);
  if (typeof pageRes.data === 'string') {
    const $ = cheerio.load(pageRes.data);
    const formToken = $('input[name="__RequestVerificationToken"]').val() as string;
    if (formToken) xsrfToken = formToken;
  }

  const baseHeaders: any = {
    'Cookie': cookies.join('; '),
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': '*/*',
    'Referer': `${baseUrl}/Marketing/TicketSourceTypeDetail?CurrentType=62`,
    'X-Requested-With': 'XMLHttpRequest'
  };
  if (token) baseHeaders['Authorization'] = `Bearer ${token}`;
  if (secretKey) baseHeaders['secretkey'] = secretKey;
  if (xsrfToken) {
    baseHeaders['xsrf-token'] = xsrfToken;
    baseHeaders['RequestVerificationToken'] = xsrfToken;
  }

  const payloadObj = {
    Name: 'KHOÁ MẸ & BÉ SOL CN',
    Note: '',
    Type: '62'
  };

  // Test 1: POST URLSearchParams without __RequestVerificationToken in body
  console.log('\n--- Test 1: POST URLSearchParams (token only in header) ---');
  const b1 = new URLSearchParams();
  b1.append('CurrentID', '0');
  b1.append('data', JSON.stringify(payloadObj));
  const res1 = await axios.post(`${baseUrl}/Marketing/TicketSourceTypeDetail?handler=Excute`, b1.toString(), {
    headers: { ...baseHeaders, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    validateStatus: () => true
  });
  console.log('Status 1:', res1.status, 'Body 1:', res1.data);
  console.log('Decompressed 1:', decompress(res1.data));

  // Test 2: POST /Marketing/TicketSourceTypeDetail/?handler=Excute (trailing slash) without token in body
  console.log('\n--- Test 2: POST with trailing slash ---');
  const res2 = await axios.post(`${baseUrl}/Marketing/TicketSourceTypeDetail/?handler=Excute`, b1.toString(), {
    headers: { ...baseHeaders, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    validateStatus: () => true
  });
  console.log('Status 2:', res2.status, 'Body 2:', res2.data);
  console.log('Decompressed 2:', decompress(res2.data));

  // Test 3: POST JSON
  console.log('\n--- Test 3: POST JSON ---');
  const res3 = await axios.post(`${baseUrl}/Marketing/TicketSourceTypeDetail?handler=Excute`, {
    CurrentID: '0',
    data: JSON.stringify(payloadObj)
  }, {
    headers: { ...baseHeaders, 'Content-Type': 'application/json' },
    validateStatus: () => true
  });
  console.log('Status 3:', res3.status, 'Body 3:', res3.data);
  console.log('Decompressed 3:', decompress(res3.data));

  // Test 4: Check handler Execute vs Excute
  console.log('\n--- Test 4: POST handler=Execute ---');
  const res4 = await axios.post(`${baseUrl}/Marketing/TicketSourceTypeDetail?handler=Execute`, b1.toString(), {
    headers: { ...baseHeaders, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    validateStatus: () => true
  });
  console.log('Status 4:', res4.status, 'Body 4:', res4.data);
  console.log('Decompressed 4:', decompress(res4.data));
}

main().catch(console.error);
