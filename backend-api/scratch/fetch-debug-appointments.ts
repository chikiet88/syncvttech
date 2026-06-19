import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as zlib from 'zlib';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

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

async function debug() {
    const baseURL = process.env.VTTECH_BASE_URL || 'https://tmtaza.vttechsolution.com';
    const username = process.env.VTTECH_USERNAME;
    const password = process.env.VTTECH_PASSWORD;

    console.log('Using Base URL:', baseURL);
    console.log('Username:', username);

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
    
    if (loginRes.headers['set-cookie']) {
        for (const c of loginRes.headers['set-cookie']) cookies.push(c.split(';')[0]);
    }

    // Step 2: Visit Master page
    console.log('\n=== STEP 2: Visit Master ===');
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

    // Step 3: Visit Appointment Page to get correct XSRF token
    console.log('\n=== STEP 3: Get XSRF from Appointment Page ===');
    const appPageRes = await instance.get('/Desk/Appointment/AppointmentInDay_Desk_Branch/', {
        headers: { Cookie: cookies.join('; ') + `; WebToken=${token}`, Accept: 'text/html' }
    });
    if (appPageRes.headers['set-cookie']) {
        for (const c of appPageRes.headers['set-cookie']) {
            const p = c.split(';')[0]; const n = p.split('=')[0];
            const idx = cookies.findIndex(x => x.startsWith(n + '='));
            if (idx >= 0) cookies[idx] = p; else cookies.push(p);
        }
    }

    let appXsrf = xsrf;
    if (typeof appPageRes.data === 'string') {
        const $a = cheerio.load(appPageRes.data);
        const newXsrf = $a('input[name="__RequestVerificationToken"]').val() as string;
        if (newXsrf) { appXsrf = newXsrf; }
    }
    console.log('XSRF for Appointment:', appXsrf ? appXsrf.slice(0, 30) + '...' : 'NONE');

    // Step 4: Call LoadataAppointmentList
    console.log('\n=== STEP 4: Call LoadataAppointmentList ===');
    const appHeaders = {
        Cookie: cookies.join('; ') + `; WebToken=${token}`,
        Authorization: `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        RequestVerificationToken: appXsrf,
        Referer: baseURL + '/Desk/Appointment/AppointmentInDay_Desk_Branch/'
    };

    // Chi nhánh 6 (Đà Nẵng), ngày 17-06-2026
    const appBody = 'handler=LoadataAppointmentList&DateFrom=17-06-2026&BranchID=6&AppID=0&StatusID=0&DoctorID=0&TypeApp=1';
    const appRes = await instance.post('/Desk/Appointment/AppointmentInDay_Desk_Branch?handler=LoadataAppointmentList', appBody, { headers: appHeaders });
    
    console.log('Status Code:', appRes.status);
    const appData = decompress(appRes.data);
    const dataItems = Array.isArray(appData) ? appData : (appData?.Data || appData?.Table || []);

    console.log(`Received ${dataItems.length} records from VTTech.`);
    
    // Save to file for analysis
    fs.writeFileSync(path.join(__dirname, './raw-appointments-dn-17-06.json'), JSON.stringify(dataItems, null, 2));
    console.log('Saved to raw-appointments-dn-17-06.json');
}

debug().catch(err => console.error('FATAL:', err.message));
