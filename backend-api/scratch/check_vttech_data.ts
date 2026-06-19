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

    const branches = [1, 2, 3, 4, 6, 7, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26];
    const targetDate = '2026-06-16';

    const searchPhones = ['385040149', '908600322', '982251996'];

    console.log('\n--- 1. Searching for Appointments on 2026-06-16 across branches ---');
    for (const bId of branches) {
        console.log(`Checking appointments for Branch ID: ${bId}...`);
        const body = `DateFrom=${targetDate}&BranchID=${bId}&AppID=0&StatusID=0&DoctorID=0&TypeApp=1`;
        try {
            const res = await instance.post('/Desk/Appointment/AppointmentInDay_Desk_Branch?handler=LoadataAppointmentList', body, {
                headers: {
                    ...commonHeaders,
                    Referer: baseURL + '/Desk/Appointment/AppointmentInDay_Desk_Branch/'
                }
            });
            const data = decompress(res.data);
            const items = Array.isArray(data) ? data : [];
            
            for (const item of items) {
                const phone = item.Phone || item.Mobile || item.CustPhone || '';
                const hasMatch = searchPhones.some(sp => phone.includes(sp));
                if (hasMatch) {
                    console.log(`[FOUND APPOINTMENT in Branch ${bId}]`);
                    console.log(JSON.stringify(item, null, 2));
                }
            }
        } catch (err: any) {
            console.error(`Error checking appointments for Branch ${bId}:`, err.message);
        }
    }

    console.log('\n--- 2. Searching for Customers on 2026-06-16 (Type 1, 2, 3, 5) ---');
    const types = [1, 2, 3, 5];
    for (const bId of branches) {
        for (const type of types) {
            console.log(`Checking customers for Branch ID: ${bId}, Type: ${type}...`);
            const body = `dateFrom=${targetDate}+00%3A00%3A00&dateTo=${targetDate}+23%3A59%3A59&branchID=${bId}&type=${type}&BeginID=0&BeginCustID=0&Limit=500`;
            try {
                const res = await instance.post('/Customer/ListCustomer?handler=LoadData', body, {
                    headers: {
                        ...commonHeaders,
                        Referer: baseURL + '/Customer/ListCustomer/'
                    }
                });
                const data = decompress(res.data);
                const items = Array.isArray(data) ? data : [];
                
                for (const item of items) {
                    const phone = item.Phone || item.Mobile || '';
                    const hasMatch = searchPhones.some(sp => phone.includes(sp));
                    if (hasMatch) {
                        console.log(`[FOUND CUSTOMER in Branch ${bId}, Type ${type}]`);
                        console.log(JSON.stringify(item, null, 2));
                    }
                }
            } catch (err: any) {
                console.error(`Error checking customers for Branch ${bId}, Type ${type}:`, err.message);
            }
        }
    }
}

main().catch(console.error);
