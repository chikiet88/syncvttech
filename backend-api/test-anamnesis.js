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
    const username = process.env.VTTECH_USERNAME || 'ittest123';
    const password = process.env.VTTECH_PASSWORD || 'ittest123';

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
        const token = loginRes.data.Session;
        if (!token) {
            console.log('Login failed');
            return;
        }

        let cookies = loginRes.headers['set-cookie']?.map(c => c.split(';')[0]) || [];
        cookies.push(`WebToken=${token}`);
        
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

        console.log('Fetching Anamnesis for customer 198445...');
        const res = await instance.post('/Customer/Anamnesis/CustomerAnamnesisList/?handler=LoadataPatientHistory', 
            `CustomerID=198445`,
            {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies.join('; '),
                    'RequestVerificationToken': xsrf
                }
            }
        );
        
        const result = decompress(res.data);
        console.log('Anamnesis raw result:', result);

        console.log('Fetching Treatment Plan for customer 198445...');
        const resPlan = await instance.post('/Customer/Service/TabList/TabList_Service/?handler=LoadataTab_Plan', 
            `CustomerID=198445`,
            {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies.join('; '),
                    'RequestVerificationToken': xsrf
                }
            }
        );
        const resultPlan = decompress(resPlan.data);
        console.log('Treatment Plan raw result:', resultPlan);

    } catch (e) {
        console.log('Error:', e.message);
    }
}

test();
