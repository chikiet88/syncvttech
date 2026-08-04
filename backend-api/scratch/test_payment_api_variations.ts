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

  // 2. Perform Login with CHIKIET / @hikiet88
  console.log(`Logging in with ${username}...`);
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
  console.log('Login result:', loginRes.data?.Message || 'OK', 'Token:', token ? 'YES' : 'NO');

  // Page fetch
  const targetUrl = `${baseUrl}/Setting/MethodPayment/MethodPaymentList`;
  const pageRes = await axios.get(targetUrl, {
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
    'User-Agent': 'Mozilla/5.0',
    'Accept': '*/*',
    'Referer': targetUrl,
    'X-Requested-With': 'XMLHttpRequest'
  };
  if (token) baseHeaders['Authorization'] = `Bearer ${token}`;
  if (secretKey) baseHeaders['secretkey'] = secretKey;
  if (xsrfToken) {
    baseHeaders['xsrf-token'] = xsrfToken;
    baseHeaders['RequestVerificationToken'] = xsrfToken;
  }

  // Testing variations
  console.log('\n--- Testing LoadDataType ---');
  // GET
  try {
    const r = await axios.get(`${targetUrl}/?handler=LoadDataType`, { headers: baseHeaders });
    console.log('GET LoadDataType status:', r.status, 'data type:', typeof decompress(r.data));
    if (r.status === 200) await Bun.write('scratch/groups.json', JSON.stringify(decompress(r.data), null, 2));
  } catch (e: any) { console.log('GET LoadDataType err:', e.message); }

  // POST JSON
  try {
    const r = await axios.post(`${targetUrl}/?handler=LoadDataType`, {}, {
      headers: { ...baseHeaders, 'Content-Type': 'application/json; charset=UTF-8' }
    });
    console.log('POST JSON LoadDataType status:', r.status, 'data type:', typeof decompress(r.data));
    if (r.status === 200) await Bun.write('scratch/groups.json', JSON.stringify(decompress(r.data), null, 2));
  } catch (e: any) { console.log('POST JSON LoadDataType err:', e.message); }

  // POST Form
  try {
    const params = new URLSearchParams();
    if (xsrfToken) params.append('__RequestVerificationToken', xsrfToken);
    const r = await axios.post(`${targetUrl}/?handler=LoadDataType`, params.toString(), {
      headers: { ...baseHeaders, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
    });
    console.log('POST Form LoadDataType status:', r.status, 'data type:', typeof decompress(r.data));
    if (r.status === 200) await Bun.write('scratch/groups.json', JSON.stringify(decompress(r.data), null, 2));
  } catch (e: any) { console.log('POST Form LoadDataType err:', e.message); }

  console.log('\n--- Testing LoadData ---');
  // GET
  try {
    const r = await axios.get(`${targetUrl}/?handler=LoadData&id=0`, { headers: baseHeaders });
    console.log('GET LoadData status:', r.status, 'data type:', typeof decompress(r.data));
    if (r.status === 200) await Bun.write('scratch/methods.json', JSON.stringify(decompress(r.data), null, 2));
  } catch (e: any) { console.log('GET LoadData err:', e.message); }

  // POST JSON
  try {
    const r = await axios.post(`${targetUrl}/?handler=LoadData`, { id: 0 }, {
      headers: { ...baseHeaders, 'Content-Type': 'application/json; charset=UTF-8' }
    });
    console.log('POST JSON LoadData status:', r.status, 'data type:', typeof decompress(r.data));
    if (r.status === 200) await Bun.write('scratch/methods.json', JSON.stringify(decompress(r.data), null, 2));
  } catch (e: any) { console.log('POST JSON LoadData err:', e.message); }

  // POST Form
  try {
    const params = new URLSearchParams();
    if (xsrfToken) params.append('__RequestVerificationToken', xsrfToken);
    params.append('id', '0');
    const r = await axios.post(`${targetUrl}/?handler=LoadData`, params.toString(), {
      headers: { ...baseHeaders, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
    });
    console.log('POST Form LoadData status:', r.status, 'data type:', typeof decompress(r.data));
    if (r.status === 200) await Bun.write('scratch/methods.json', JSON.stringify(decompress(r.data), null, 2));
  } catch (e: any) { console.log('POST Form LoadData err:', e.message); }
}

main().catch(console.error);
