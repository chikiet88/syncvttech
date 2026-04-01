
const axios = require('axios');
const zlib = require('zlib');
require('dotenv').config({ path: './backend-api/.env' });

function decompress(data) {
    if (!data || typeof data !== 'string' || !data.startsWith('"') || !data.endsWith('"')) {
        return data;
    }
    try {
        const cleanData = data.replace(/^"|"$/g, '');
        const buffer = Buffer.from(cleanData, 'base64');
        return zlib.gunzipSync(buffer).toString('utf-8');
    } catch (e) {
        return data;
    }
}

async function test() {
    const baseURL = 'https://tmtaza.vttechsolution.com';
    const username = process.env.VTTECH_USERNAME;
    const password = process.env.VTTECH_PASSWORD;

    const instance = axios.create({ 
        baseURL, 
        withCredentials: true,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    
    console.log('Logging in...');
    try {
        const loginPayload = { 
            username, 
            password,
            passwordcrypt: "",
            from: "",
            sso: "",
            ssotoken: ""
        };
        const loginRes = await instance.post('/api/Author/Login', loginPayload);
        console.log('Login Status:', loginRes.status);
        console.log('Login Data:', JSON.stringify(loginRes.data));
        const token = loginRes.data.Session;
        if (!token) {
            console.log('Login failed, no session token');
            return;
        }
        console.log('Token:', token.slice(0, 10));

        let cookies = loginRes.headers['set-cookie']?.map(c => c.split(';')[0]) || [];
        cookies.push(`WebToken=${token}`);
        
        console.log('Getting XSRF...');
        const pageRes = await instance.get('/Customer/ListCustomer/', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cookie': cookies.join('; ')
            }
        });
        
        const pageCookies = pageRes.headers['set-cookie']?.map(c => c.split(';')[0]) || [];
        pageCookies.forEach(pc => {
            const name = pc.split('=')[0];
            cookies = cookies.filter(c => !c.startsWith(name + '='));
            cookies.push(pc);
        });

        const xsrfMatch = pageRes.data.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/);
        const xsrf = xsrfMatch ? xsrfMatch[1] : null;
        console.log('XSRF:', xsrf?.slice(0, 10));

        console.log('Fetching revenue for March 24...');
        const res = await instance.post('/Report/Revenue/Branch/AllBranchGrid/?handler=LoadataDetailByBranch', 
            `branchID=0&dateFrom=24-03-2026&dateTo=24-03-2026`,
            {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies.join('; ')
                }
            }
        );
        
        console.log('Response status:', res.status);
        console.log('Response sample:', String(res.data).slice(0, 100));
        
        const result = decompress(res.data);
        try {
            const json = JSON.parse(result);
            console.log('Count:', json?.Table?.length || 0);
        } catch (e) {
            console.log('Parsed text sample:', result.slice(0, 100));
        }

    } catch (e) {
        console.log('Error:', e.message);
        if (e.response) {
            console.log('Error Data:', String(e.response.data).slice(0, 100));
        }
    }
}

test();
