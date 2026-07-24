import axios from 'axios';
import * as cheerio from 'cheerio';

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

  // 3. GET /Marketing/TicketSourceTypeDetail?CurrentType=62
  console.log('📡 Fetching /Marketing/TicketSourceTypeDetail?CurrentType=62...');
  const formRes = await axios.get(`${baseUrl}/Marketing/TicketSourceTypeDetail?CurrentType=62&ver=${Date.now()}`, {
    headers: {
      'Cookie': cookies.join('; '),
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html',
      'Authorization': `Bearer ${token}`
    }
  });

  if (typeof formRes.data === 'string') {
    await Bun.write('scratch/detail_form.html', formRes.data);
    console.log('Saved scratch/detail_form.html');

    const $ = cheerio.load(formRes.data);
    console.log('\n--- Form Inputs ---');
    $('input, select, textarea').each((_, el) => {
      console.log($(el).attr('id') || $(el).attr('name'), '| type:', $(el).attr('type'), '| val:', $(el).val());
    });

    console.log('\n--- Script Content ---');
    $('script').each((i, el) => {
      const text = $(el).html() || '';
      console.log(`Script #${i} (length ${text.length}):\n`, text);
    });
  }
}

main().catch(console.error);
