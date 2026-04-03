"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const zlib = __importStar(require("zlib"));
dotenv.config({ path: path.join(__dirname, './backend-api/.env') });
function decompress(data) {
    if (!data)
        return null;
    try {
        const cleanData = data.replace(/^"|"$/g, '');
        const buffer = Buffer.from(cleanData, 'base64');
        try {
            const decompressed = zlib.gunzipSync(buffer);
            return JSON.parse(decompressed.toString('utf-8'));
        }
        catch (e) {
            try {
                const decompressed = zlib.inflateSync(buffer);
                return JSON.parse(decompressed.toString('utf-8'));
            }
            catch (e2) {
                const decompressed = zlib.inflateRawSync(buffer);
                return JSON.parse(decompressed.toString('utf-8'));
            }
        }
    }
    catch (error) {
        try {
            return JSON.parse(data);
        }
        catch (e) {
            return data;
        }
    }
}
async function test() {
    const baseURL = process.env.VTTECH_BASE_URL;
    const username = process.env.VTTECH_USERNAME;
    const password = process.env.VTTECH_PASSWORD;
    const instance = axios_1.default.create({ baseURL, withCredentials: true });
    console.log('Logging in...');
    const loginRes = await instance.post('/api/Author/Login', { username, password });
    const token = loginRes.data.Session;
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('Getting XSRF...');
    const pageRes = await instance.get('/Customer/ListCustomer/');
    const cookie = pageRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
    const res = await instance.post('/Report/Revenue/Branch/AllBranchGrid/?handler=LoadataDetailByBranch', 'branchID=0&dateFrom=01-01-2026&dateTo=07-01-2026', {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': `${cookie}; WebToken=${token}`
        }
    });
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
//# sourceMappingURL=inspect-test.js.map