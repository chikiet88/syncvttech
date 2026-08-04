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
  console.log('1. Fetching login page...');
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
  console.log('2. Logging in...');
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

  // 3. Initialize session data
  console.log('3. Initializing session endpoints...');
  const commonHeaders: any = {
    'Cookie': cookies.join('; '),
    'User-Agent': 'Mozilla/5.0',
    'Authorization': `Bearer ${token}`
  };

  const resLang = await axios.get(`${baseUrl}/api/Home/Language/?ver=${Date.now()}`, { headers: commonHeaders });
  updateCookies(resLang.headers['set-cookie']);

  const resSessData = await axios.post(`${baseUrl}/api/Home/SessionData`, {}, {
    headers: { ...commonHeaders, 'Content-Type': 'application/json' }
  });
  updateCookies(resSessData.headers['set-cookie']);

  const resDash = await axios.get(`${baseUrl}/Main/Dashboard/`, { headers: commonHeaders });
  updateCookies(resDash.headers['set-cookie']);

  // 4. Get /Setting/MethodPayment/MethodPaymentList page
  console.log('4. Fetching MethodPaymentList page...');
  const pageRes = await axios.get(`${baseUrl}/Setting/MethodPayment/MethodPaymentList`, {
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
    'Referer': `${baseUrl}/Setting/MethodPayment/MethodPaymentList`,
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
  };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  if (secretKey) reqHeaders['secretkey'] = secretKey;
  if (xsrfToken) {
    reqHeaders['xsrf-token'] = xsrfToken;
    reqHeaders['RequestVerificationToken'] = xsrfToken;
  }

  // 5. Fetch LoadDataType (Groups)
  console.log('5. Fetching payment groups (LoadDataType)...');
  const formDataType = new URLSearchParams();
  if (xsrfToken) formDataType.append('__RequestVerificationToken', xsrfToken);

  const resTypes = await axios.post(`${baseUrl}/Setting/MethodPayment/MethodPaymentList/?handler=LoadDataType`, formDataType.toString(), {
    headers: reqHeaders,
    validateStatus: () => true
  });
  console.log('resTypes status:', resTypes.status);
  const groups = decompress(resTypes.data);

  // 6. Fetch LoadData (Methods)
  console.log('6. Fetching payment methods (LoadData)...');
  const formData = new URLSearchParams();
  if (xsrfToken) formData.append('__RequestVerificationToken', xsrfToken);
  formData.append('id', '0');

  const resMethods = await axios.post(`${baseUrl}/Setting/MethodPayment/MethodPaymentList/?handler=LoadData`, formData.toString(), {
    headers: reqHeaders,
    validateStatus: () => true
  });
  console.log('resMethods status:', resMethods.status);
  const methods = decompress(resMethods.data);

  console.log('\n================ GROUPS DATA ================');
  console.log(groups);
  console.log('\n================ METHODS DATA ================');
  console.log(methods);

  await Bun.write('scratch/payment_groups.json', JSON.stringify(groups, null, 2));
  await Bun.write('scratch/payment_methods.json', JSON.stringify(methods, null, 2));
}

main().catch(console.error);
