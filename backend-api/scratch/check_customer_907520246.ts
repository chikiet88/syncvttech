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

async function main() {
    const baseURL = process.env.VTTECH_BASE_URL || 'https://tmtaza.vttechsolution.com';
    const username = process.env.VTTECH_USERNAME;
    const password = process.env.VTTECH_PASSWORD;

    const cookies: string[] = [];
    const instance = axios.create({ baseURL, maxRedirects: 5, validateStatus: () => true, timeout: 25000 });

    console.log('Logging in...');
    const loginRes = await instance.post('/api/Author/Login', {
        UserName: username, Password: password, PasswordEnCrypt: "", IP: "",
        TokenFCM: "", From: "", SSO: "", Lan: "vi", TokenSSO: ""
    });
    const token = loginRes.data.Session;
    if (!token) {
        console.error('Login failed:', loginRes.data);
        return;
    }
    console.log('Login success!');

    if (loginRes.headers['set-cookie']) {
        for (const c of loginRes.headers['set-cookie']) cookies.push(c.split(';')[0]);
    }

    console.log('Priming Session...');
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
    console.log('XSRF:', xsrf ? 'OK' : 'NONE');

    const commonHeaders = {
        Cookie: cookies.join('; ') + `; WebToken=${token}`,
        Authorization: `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        RequestVerificationToken: xsrf,
    };

    // Priming Session data
    await instance.post('/api/Home/SessionData', {}, {
        headers: { Cookie: cookies.join('; ') + `; WebToken=${token}`, Authorization: `Bearer ${token}` }
    });

    const targetPhone = '0907520246';
    const targetCustId = 200394;

    console.log('\n--- 1. Checking Customer on VTTech ---');
    // We search using the Search box by phone
    // The main customer search API might be different. Let's see if we can find it.
    // Let's call /Customer/ListCustomer?handler=LoadData with date range far in past to now
    const searchBody = `dateFrom=2026-06-01+00%3A00%3A00&dateTo=2026-06-22+23%3A59%3A59&branchID=1&type=0&BeginID=0&BeginCustID=0&Limit=500`;
    try {
        const res = await instance.post('/Customer/ListCustomer?handler=LoadData', searchBody, {
            headers: { ...commonHeaders, Referer: baseURL + '/Customer/ListCustomer/' }
        });
        const data = decompress(res.data);
        const items = Array.isArray(data) ? data : [];
        console.log(`Found ${items.length} customers in June branch 1.`);
        const match = items.find((item: any) => (item.Phone || '').includes(targetPhone) || item.ID === targetCustId);
        if (match) {
            console.log('Found Customer match on VTTech:');
            console.log(JSON.stringify(match, null, 2));
        } else {
            console.log('Customer NOT found in recent ListCustomer results.');
        }
    } catch (err: any) {
        console.error('Error listing customers:', err.message);
    }

    console.log('\n--- 2. Checking ScheduleList for Customer 200394 ---');
    try {
        const body = `CustomerID=${targetCustId}&TicketID=0&Limit=100&BeginID=0&BeginDate=0&IsDelete=0&IsCancel=1&IsTemp=0`;
        const res = await instance.post('/Customer/ScheduleList_Schedule/?handler=Loadata', body, {
            headers: { ...commonHeaders, Referer: baseURL + `/Customer/ScheduleList_Schedule/` }
        });
        const data = decompress(res.data);
        console.log('Schedule API response for Customer 200394:');
        console.log(JSON.stringify(data, null, 2));
    } catch (err: any) {
        console.error('Error fetching schedules:', err.message);
    }

    console.log('\n--- 3. Checking Appointment list for branch 1 on 2026-06-20 ---');
    try {
        const body = `DateFrom=2026-06-20&BranchID=1&AppID=0&StatusID=0&DoctorID=0&TypeApp=1`;
        const res = await instance.post('/Desk/Appointment/AppointmentInDay_Desk_Branch?handler=LoadataAppointmentList', body, {
            headers: { ...commonHeaders, Referer: baseURL + '/Desk/Appointment/AppointmentInDay_Desk_Branch/' }
        });
        const data = decompress(res.data);
        const items = Array.isArray(data) ? data : [];
        console.log(`Found ${items.length} appointments on 2026-06-20 in branch 1.`);
        const match = items.find((item: any) => parseInt(item.ID) === 778028 || (item.Phone || '').includes(targetPhone));
        if (match) {
            console.log('Found Appointment match in day list on VTTech:');
            console.log(JSON.stringify(match, null, 2));
        } else {
            console.log('Appointment NOT found in day list on VTTech.');
        }
    } catch (err: any) {
        console.error('Error listing day appointments:', err.message);
    }
}

main().catch(console.error);
