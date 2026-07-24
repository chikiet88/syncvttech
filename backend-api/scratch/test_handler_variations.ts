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

  // 3. GET /Marketing/TicketSourceList page
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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Referer': `${baseUrl}/Marketing/TicketSourceList`,
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  if (secretKey) reqHeaders['secretkey'] = secretKey;
  if (xsrfToken) {
    reqHeaders['xsrf-token'] = xsrfToken;
    reqHeaders['RequestVerificationToken'] = xsrfToken;
  }

  // Variation 1: GET /Marketing/TicketSourceList?handler=LoadData
  console.log('--- Test 1: GET /Marketing/TicketSourceList?handler=LoadData ---');
  const res1 = await axios.get(`${baseUrl}/Marketing/TicketSourceList?handler=LoadData`, {
    headers: reqHeaders,
    validateStatus: () => true
  });
  console.log('Status:', res1.status);
  console.log('Body:', typeof res1.data === 'string' ? res1.data.substring(0, 300) : res1.data);

  // Variation 2: POST /Marketing/TicketSourceList?handler=LoadData (no trailing slash, form-urlencoded)
  console.log('\n--- Test 2: POST /Marketing/TicketSourceList?handler=LoadData (form urlencoded) ---');
  const formBody = new URLSearchParams();
  if (xsrfToken) formBody.append('__RequestVerificationToken', xsrfToken);

  const res2 = await axios.post(`${baseUrl}/Marketing/TicketSourceList?handler=LoadData`, formBody.toString(), {
    headers: {
      ...reqHeaders,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    validateStatus: () => true
  });
  console.log('Status:', res2.status);
  const decomp2 = decompress(res2.data);
  console.log('Decompressed:', typeof decomp2, Array.isArray(decomp2) ? decomp2.length : (typeof decomp2 === 'object' ? Object.keys(decomp2) : String(decomp2).substring(0, 300)));

  if (decomp2 && (decomp2.Table || decomp2.Table1)) {
    await Bun.write('scratch/sources_decompressed.json', JSON.stringify(decomp2, null, 2));
    console.log('SUCCESS! Saved to scratch/sources_decompressed.json');
  }

  // Variation 3: POST /Marketing/TicketSourceList?handler=LoadData (JSON body or empty body)
  console.log('\n--- Test 3: POST /Marketing/TicketSourceList?handler=LoadData (empty body) ---');
  const res3 = await axios.post(`${baseUrl}/Marketing/TicketSourceList?handler=LoadData`, '', {
    headers: reqHeaders,
    validateStatus: () => true
  });
  console.log('Status:', res3.status);
  const decomp3 = decompress(res3.data);
  console.log('Decompressed:', typeof decomp3, Array.isArray(decomp3) ? decomp3.length : (typeof decomp3 === 'object' ? Object.keys(decomp3) : String(decomp3).substring(0, 300)));
}

main().catch(console.error);
