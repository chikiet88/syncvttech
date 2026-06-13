import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as zlib from 'zlib';
import * as cheerio from 'cheerio';

dotenv.config({ path: path.join(__dirname, './backend-api/.env') });

function decompress(data: any): any {
    if (typeof data !== 'string') return data;
    try {
        if (data.trim().startsWith('{') || data.trim().startsWith('[')) return JSON.parse(data);
        const clean = data.replace(/^"|"$/g, '');
        const buf = Buffer.from(clean, 'base64');
        try { return JSON.parse(zlib.gunzipSync(buf).toString('utf-8')); }
        catch { try { return JSON.parse(zlib.inflateSync(buf).toString('utf-8')); }
        catch { return JSON.parse(zlib.inflateRawSync(buf).toString('utf-8')); } }
    } catch { try { return JSON.parse(data); } catch { return data; } }
}

async function debug() {
    const baseURL = process.env.VTTECH_BASE_URL || 'https://tmtaza.vttechsolution.com';
    const username = process.env.VTTECH_USERNAME;
    const password = process.env.VTTECH_PASSWORD;

    const cookies: string[] = [];
    const instance = axios.create({ baseURL, maxRedirects: 5, validateStatus: () => true, timeout: 15000 });

    // Step 1: Login
    console.log('=== STEP 1: Login ===');
    const loginRes = await instance.post('/api/Author/Login', {
        UserName: username, Password: password, PasswordEnCrypt: "", IP: "",
        TokenFCM: "", From: "", SSO: "", Lan: "vi", TokenSSO: ""
    });
    const token = loginRes.data.Session;
    console.log('Token:', token ? token.slice(0, 20) + '...' : 'FAILED');
    if (!token) { console.log('LOGIN FAILED:', JSON.stringify(loginRes.data)); return; }
    
    // Collect cookies from login
    if (loginRes.headers['set-cookie']) {
        for (const c of loginRes.headers['set-cookie']) cookies.push(c.split(';')[0]);
    }

    // Step 2: Visit Master page to prime session
    console.log('\n=== STEP 2: Prime Session (Master_Top) ===');
    const masterRes = await instance.get('/Master/Master_Top/', {
        headers: { Cookie: cookies.join('; ') + `; WebToken=${token}`, Accept: 'text/html' },
        maxRedirects: 5
    });
    console.log('Master Status:', masterRes.status);
    if (masterRes.headers['set-cookie']) {
        for (const c of masterRes.headers['set-cookie']) {
            const p = c.split(';')[0]; const n = p.split('=')[0];
            const idx = cookies.findIndex(x => x.startsWith(n + '='));
            if (idx >= 0) cookies[idx] = p; else cookies.push(p);
        }
    }
    
    // Extract XSRF from Master page
    let xsrf = '';
    if (typeof masterRes.data === 'string') {
        const $ = cheerio.load(masterRes.data);
        xsrf = $('input[name="__RequestVerificationToken"]').val() as string || '';
    }
    console.log('XSRF from Master:', xsrf ? xsrf.slice(0, 30) + '...' : 'NONE');
    console.log('Cookies count:', cookies.length);

    const commonHeaders = {
        Cookie: cookies.join('; ') + `; WebToken=${token}`,
        Authorization: `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        RequestVerificationToken: xsrf,
    };

    // Step 3: NotiItemCount (mồi session)
    console.log('\n=== STEP 3: NotiItemCount ===');
    const notiRes = await instance.post('/Master/Master_Top?handler=NotiItemCount', 'handler=NotiItemCount', {
        headers: { ...commonHeaders, Referer: baseURL + '/Master/Master_Top/' }
    });
    console.log('NotiItemCount Status:', notiRes.status);
    const notiData = decompress(notiRes.data);
    console.log('NotiItemCount Data:', JSON.stringify(notiData).slice(0, 200));

    // Step 4: Test CUSTOMER - XSRF cần lấy từ đúng trang Customer
    console.log('\n=== STEP 4: Get XSRF from Customer Page ===');
    const custPageRes = await instance.get('/Customer/ListCustomer/', {
        headers: { Cookie: commonHeaders.Cookie, Accept: 'text/html' },
        maxRedirects: 5
    });
    console.log('Customer Page Status:', custPageRes.status);
    if (custPageRes.headers['set-cookie']) {
        for (const c of custPageRes.headers['set-cookie']) {
            const p = c.split(';')[0]; const n = p.split('=')[0];
            const idx = cookies.findIndex(x => x.startsWith(n + '='));
            if (idx >= 0) cookies[idx] = p; else cookies.push(p);
        }
    }
    
    let custXsrf = xsrf;
    if (typeof custPageRes.data === 'string') {
        const $c = cheerio.load(custPageRes.data);
        const newXsrf = $c('input[name="__RequestVerificationToken"]').val() as string;
        if (newXsrf) { custXsrf = newXsrf; console.log('Customer XSRF:', custXsrf.slice(0, 30) + '...'); }
        else console.log('Customer XSRF: Using Master XSRF');
    }

    // Step 5: LoadData Customer
    console.log('\n=== STEP 5: LoadData Customer ===');
    const custHeaders = {
        Cookie: cookies.join('; ') + `; WebToken=${token}`,
        Authorization: `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        RequestVerificationToken: custXsrf,
        Referer: baseURL + '/Customer/ListCustomer/'
    };
    const custBody = 'handler=LoadData&dateFrom=2026-04-03+00%3A00%3A00&dateTo=2026-04-03+23%3A59%3A59&branchID=1&type=5&BeginID=0&BeginCustID=0&Limit=100';
    const custRes = await instance.post('/Customer/ListCustomer?handler=LoadData', custBody, { headers: custHeaders });
    console.log('Customer LoadData Status:', custRes.status);
    const custData = decompress(custRes.data);
    
    if (Array.isArray(custData)) console.log(`Customer LoadData: ${custData.length} records`);
    else if (custData && typeof custData === 'object') {
        for (const k of Object.keys(custData)) {
            if (Array.isArray(custData[k])) console.log(`  ${k}: ${custData[k].length} records`);
            else console.log(`  ${k}:`, typeof custData[k]);
        }
    } else console.log('Customer raw data type:', typeof custData, String(custData).slice(0, 200));

    // Step 6: Revenue
    console.log('\n=== STEP 6: Revenue LoadData ===');
    const revPageRes = await instance.get('/Report/Revenue/Branch/AllBranchGrid/', {
        headers: { Cookie: cookies.join('; ') + `; WebToken=${token}`, Accept: 'text/html' },
        maxRedirects: 5
    });
    if (revPageRes.headers['set-cookie']) {
        for (const c of revPageRes.headers['set-cookie']) {
            const p = c.split(';')[0]; const n = p.split('=')[0];
            const idx = cookies.findIndex(x => x.startsWith(n + '='));
            if (idx >= 0) cookies[idx] = p; else cookies.push(p);
        }
    }
    let revXsrf = custXsrf;
    if (typeof revPageRes.data === 'string') {
        const $r = cheerio.load(revPageRes.data);
        const t = $r('input[name="__RequestVerificationToken"]').val() as string;
        if (t) revXsrf = t;
    }
    console.log('Revenue Page Status:', revPageRes.status);
    
    const revHeaders = {
        Cookie: cookies.join('; ') + `; WebToken=${token}`,
        Authorization: `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        RequestVerificationToken: revXsrf,
        Referer: baseURL + '/Report/Revenue/Branch/AllBranchGrid/'
    };
    const revBody = 'handler=LoadataDetailByBranch&branchID=0&dateFrom=01-04-2026&dateTo=03-04-2026&Limit=1000&BeginID=0';
    const revRes = await instance.post('/Report/Revenue/Branch/AllBranchGrid?handler=LoadataDetailByBranch', revBody, { headers: revHeaders });
    console.log('Revenue Status:', revRes.status);
    const revData = decompress(revRes.data);
    
    if (revData && typeof revData === 'object') {
        for (const k of Object.keys(revData)) {
            if (Array.isArray(revData[k])) console.log(`  ${k}: ${revData[k].length} records`);
            else console.log(`  ${k}:`, typeof revData[k]);
        }
    }

    // Step 7: SessionData
    console.log('\n=== STEP 7: SessionData ===');
    const sessRes = await instance.post('/api/Home/SessionData', {}, {
        headers: { Cookie: cookies.join('; ') + `; WebToken=${token}`, Authorization: `Bearer ${token}` }
    });
    console.log('SessionData Status:', sessRes.status);
    const sessData = sessRes.data;
    if (sessData && typeof sessData === 'object') {
        for (const k of Object.keys(sessData)) {
            if (Array.isArray(sessData[k])) console.log(`  ${k}: ${sessData[k].length} records`);
            else console.log(`  ${k}:`, typeof sessData[k], String(sessData[k]).slice(0, 50));
        }
    }
}

debug().catch(err => console.error('FATAL:', err.message));
