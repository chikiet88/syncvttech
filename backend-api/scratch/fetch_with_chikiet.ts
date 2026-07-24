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

  console.log(`🔑 Logging into ${baseUrl} as ${username}...`);

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
  console.log('Login result:', loginRes.status, loginRes.data?.FullName || loginRes.data?.UserName || loginRes.data);

  const token = loginRes.data?.Session;
  if (!token) {
    console.error('❌ Login failed or token not found');
    return;
  }

  for (const cName of ['WebToken', 'Token', 'token']) {
    cookies.push(`${cName}=${token}`);
  }

  // 3. GET /Marketing/TicketSourceList page
  console.log('📡 Fetching /Marketing/TicketSourceList...');
  const pageRes = await axios.get(`${baseUrl}/Marketing/TicketSourceList?ver=${Date.now()}`, {
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

  const reqHeaders: any = {
    'Cookie': cookies.join('; '),
    'User-Agent': 'Mozilla/5.0',
    'Accept': '*/*',
    'Referer': `${baseUrl}/Marketing/TicketSourceList`,
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
  };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  if (secretKey) reqHeaders['secretkey'] = secretKey;
  if (xsrfToken) {
    reqHeaders['xsrf-token'] = xsrfToken;
    reqHeaders['RequestVerificationToken'] = xsrfToken;
  }

  const formBody = new URLSearchParams();
  if (xsrfToken) formBody.append('__RequestVerificationToken', xsrfToken);

  console.log('📡 Calling POST /Marketing/TicketSourceList/?handler=LoadData...');
  const res = await axios.post(`${baseUrl}/Marketing/TicketSourceList/?handler=LoadData`, formBody.toString(), {
    headers: reqHeaders
  });

  console.log('LoadData Response Status:', res.status);
  const decomp = decompress(res.data);
  console.log('Decompressed response keys:', decomp ? Object.keys(decomp) : null);

  if (decomp && (decomp.Table || decomp.Table1)) {
    await Bun.write('scratch/sources_decompressed.json', JSON.stringify(decomp, null, 2));
    console.log('✅ Saved scratch/sources_decompressed.json successfully!');
    console.log(`Table (Nguồn chính): ${decomp.Table?.length || 0} items`);
    console.log(`Table1 (Nguồn chi tiết): ${decomp.Table1?.length || 0} items`);
    if (decomp.Table?.length > 0) console.log('Sample Table[0]:', decomp.Table[0]);
    if (decomp.Table1?.length > 0) console.log('Sample Table1[0]:', decomp.Table1[0]);
  } else {
    console.log('Raw output preview:', String(res.data).substring(0, 500));
  }
}

main().catch(console.error);
