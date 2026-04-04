import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function scan() {
    const base = process.env.VTTECH_BASE_URL!;
    const r1 = await axios.post(base + '/api/Author/Login', {
        UserName: process.env.VTTECH_USERNAME, Password: process.env.VTTECH_PASSWORD,
        PasswordEnCrypt: '', IP: '', TokenFCM: '', From: '', SSO: '', Lan: 'vi', TokenSSO: ''
    }, { validateStatus: () => true });
    const token = r1.data?.Session;
    if (!token) { console.log('LOGIN FAIL'); return; }
    
    const cookies: string[] = [];
    if (r1.headers['set-cookie']) for (const c of r1.headers['set-cookie']) cookies.push(c.split(';')[0]);
    cookies.push(`WebToken=${token}`);
    const ck = cookies.join('; ');

    const urls = ['/', '/Index/', '/index.html', '/Master/Master_Top/', '/Home/', '/Dashboard/',
        '/Report/ReportGeneral/', '/Home/Index/', '/Master_Top/', '/home/index'];
    
    for (const url of urls) {
        try {
            const r = await axios.get(base + url, {
                headers: { Cookie: ck, Accept: 'text/html' },
                maxRedirects: 0, validateStatus: () => true, timeout: 5000
            });
            const loc = r.status >= 300 && r.status < 400 ? ` -> ${r.headers['location']}` : '';
            const size = typeof r.data === 'string' ? ` (${r.data.length} bytes)` : '';
            console.log(`${url}: ${r.status}${loc}${size}`);
        } catch (e: any) { console.log(`${url}: ERROR ${e.message}`); }
    }
}
scan().catch(e => console.error(e.message));
