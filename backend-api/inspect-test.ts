
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as zlib from 'zlib';

dotenv.config({ path: path.join(__dirname, './backend-api/.env') });

function decompress(data: string): any {
    if (!data) return null;
    try {
        const cleanData = data.replace(/^"|"$/g, '');
        const buffer = Buffer.from(cleanData, 'base64');
        try {
            const decompressed = zlib.gunzipSync(buffer);
            return JSON.parse(decompressed.toString('utf-8'));
        } catch (e) {
            try {
                const decompressed = zlib.inflateSync(buffer);
                return JSON.parse(decompressed.toString('utf-8'));
            } catch (e2) {
                const decompressed = zlib.inflateRawSync(buffer);
                return JSON.parse(decompressed.toString('utf-8'));
            }
        }
    } catch (error) {
        try {
            return JSON.parse(data);
        } catch (e) {
            return data;
        }
    }
}

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

    const result = decompress(res.data);
    
    for (const tableName in result) {
        const table = result[tableName];
        if (Array.isArray(table) && table.length > 0) {
            console.log(`\nTable: ${tableName}, Count: ${table.length}`);
            console.log('Keys:', Object.keys(table[0]));
            if (tableName === 'Table1' || tableName === 'Table') {
                console.log('Sample row:', JSON.stringify(table[0], null, 2));
            }
        }
    }
}

test();
