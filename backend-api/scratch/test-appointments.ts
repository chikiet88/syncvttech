import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as zlib from 'zlib';
import * as cheerio from 'cheerio';

dotenv.config({ path: path.join(__dirname, '../.env') });

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

async function test() {
    const baseURL = process.env.VTTECH_BASE_URL || 'https://tmtaza.vttechsolution.com';
    const username = process.env.VTTECH_USERNAME;
    const password = process.env.VTTECH_PASSWORD;

    const cookies: string[] = [];
    const instance = axios.create({ 
        baseURL, 
        maxRedirects: 5, 
        validateStatus: () => true, 
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
        }
    });

    console.log('Logging in...');
    const loginRes = await instance.post('/api/Author/Login', {
        UserName: username, Password: password, PasswordEnCrypt: "", IP: "",
        TokenFCM: "", From: "", SSO: "", Lan: "vi", TokenSSO: ""
    });
    const token = loginRes.data.Session;
    const secretKey = 'ZdB9AsmlnaqopXnryYe8Uyj9YXaG0lZ09fNEljAifOESjErNDKj8TGtf0tGyKg2QpFsfOj5zQOUe+hiU1aN5mptaw7+sGwccT8pT0yFLgKE=';
    if (!token) { console.log('Login failed'); return; }
    console.log('Login success, token:', token.slice(0, 10) + '...');

    if (loginRes.headers['set-cookie']) {
        for (const c of loginRes.headers['set-cookie']) cookies.push(c.split(';')[0]);
    }

    console.log('Priming Session (Master_Top)...');
    const masterRes = await instance.get('/Master/Master_Top/', {
        headers: { Cookie: cookies.join('; ') + `; WebToken=${token}`, Accept: 'text/html' }
    });
    if (masterRes.headers['set-cookie']) {
        for (const c of masterRes.headers['set-cookie']) {
            const p = c.split(';')[0]; const n = p.split('=')[0];
            const idx = cookies.findIndex(x => x.startsWith(n + '='));
            if (idx >= 0) cookies[idx] = p; else cookies.push(p);
        }
    }
    
    let xsrf = '';
    if (typeof masterRes.data === 'string') {
        const $ = cheerio.load(masterRes.data);
        xsrf = $('input[name="__RequestVerificationToken"]').val() as string || '';
    }

    const commonHeaders = {
        Cookie: cookies.join('; ') + `; WebToken=${token}`,
        Authorization: `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        'xsrf-token': xsrf,
        RequestVerificationToken: xsrf,
        secretkey: secretKey,
        'Referer': baseURL + '/Master/Master_Top/'
    };

    console.log('NotiItemCount...');
    const notiRes = await instance.post('/Master/Master_Top?handler=NotiItemCount', 'handler=NotiItemCount', {
        headers: commonHeaders
    });
    console.log(`NotiItemCount POST status: ${notiRes.status}`);

    console.log('Getting Appointment Page...');
    const pageRes = await instance.get('/Desk/Appointment/AppointmentInDay_Desk_Branch/', {
        headers: { Cookie: cookies.join('; ') + `; WebToken=${token}`, Accept: 'text/html' }
    });
    console.log(`Appointment Page GET status: ${pageRes.status}`);
    
    if (pageRes.headers['set-cookie']) {
        for (const c of pageRes.headers['set-cookie']) {
            const p = c.split(';')[0]; const n = p.split('=')[0];
            const idx = cookies.findIndex(x => x.startsWith(n + '='));
            if (idx >= 0) cookies[idx] = p; else cookies.push(p);
        }
    }
    
    let pageXsrf = xsrf;
    if (typeof pageRes.data === 'string') {
        const $c = cheerio.load(pageRes.data);
        const newXsrf = $c('input[name="__RequestVerificationToken"]').val() as string;
        if (newXsrf) {
            pageXsrf = newXsrf;
            console.log(`Found XSRF token: ${pageXsrf.slice(0, 15)}...`);
        }
    }

    console.log('Fetching appointments...');
    const headers = {
        Cookie: cookies.join('; ') + `; WebToken=${token}`,
        Authorization: `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        'xsrf-token': pageXsrf,
        RequestVerificationToken: pageXsrf,
        secretkey: secretKey,
        Referer: baseURL + '/Desk/Appointment/AppointmentInDay_Desk_Branch/'
    };

    const d = '2026-05-25';
    const bId = '1';
    
    const formBody = new URLSearchParams();
    formBody.append('DateFrom', d);
    formBody.append('BranchID', bId);
    formBody.append('AppID', '0');
    formBody.append('StatusID', '0');
    formBody.append('DoctorID', '0');
    formBody.append('TypeApp', '1');
    formBody.append('__RequestVerificationToken', pageXsrf);

    const res = await instance.post('/Desk/Appointment/AppointmentInDay_Desk_Branch/?handler=LoadataAppointmentList', formBody, { headers });
    console.log(`HTTP Response status: ${res.status}`);
    
    const data = decompress(res.data);
    
    let items: any[] = [];
    if (data) {
        if (Array.isArray(data)) items = data;
        else if (data.Table) items = data.Table;
        else if (typeof data === 'object') {
            const keys = Object.keys(data);
            if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
                items = Object.values(data);
            } else {
                items = data.Table || [];
            }
        }
    }
    console.log(`Items count: ${items.length}`);
    
    const statusMap = new Map<number, Set<string>>();
    for (const item of items) {
        const statusId = parseInt(item.TypeStatusID || item.Status || item.StatusID || item.State || '0');
        const statusLabel = item.StatusName || item.TypeName || item.StateName || item.StatusText || 'Unknown';
        if (!statusMap.has(statusId)) {
            statusMap.set(statusId, new Set());
        }
        statusMap.get(statusId)!.add(statusLabel);
        
        console.log(`- ID=${statusId}, Label=${statusLabel}, TypeName=${item.TypeName}, StatusName=${item.StatusName}`);
    }
}

test().catch(console.error);
