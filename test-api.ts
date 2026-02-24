
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../backend-api/.env') });

async function test() {
    const baseURL = process.env.VTTECH_BASE_URL;
    const username = process.env.VTTECH_USERNAME;
    const password = process.env.VTTECH_PASSWORD;

    const instance = axios.create({ baseURL, withCredentials: true });

    console.log('Logging in...');
    const loginRes = await instance.post('/api/Author/Login', { username, password });
    const token = loginRes.data.Session;
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    console.log('Getting XSRF...');
    const pageRes = await instance.get('/Customer/ListCustomer/');
    const cookie = pageRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');

    const res = await instance.post('/Report/Revenue/Branch/AllBranchGrid/?handler=LoadataDetailByBranch', 
        'branchID=0&dateFrom=01-01-2026&dateTo=07-01-2026',
        {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': `${cookie}; WebToken=${token}`
            }
        }
    );

    const data = res.data;
    // VTTech often returns base64 gzipped data
    console.log('Keys in result:', Object.keys(data));
    
    // If it's the usual format, we need to decompress. But I'll just check if Table/Table1 are there.
}

test();
