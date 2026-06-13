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
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const axios_1 = __importDefault(require("axios"));
async function getGoogleSheetsAccessToken(clientEmail, privateKey) {
    const header = {
        alg: 'RS256',
        typ: 'JWT',
    };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
    };
    const base64UrlEncode = (obj) => {
        return Buffer.from(JSON.stringify(obj))
            .toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    };
    const tokenInput = `${base64UrlEncode(header)}.${base64UrlEncode(claim)}`;
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(tokenInput);
    const signature = signer.sign(formattedPrivateKey, 'base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    const jwt = `${tokenInput}.${signature}`;
    const response = await axios_1.default.post('https://oauth2.googleapis.com/token', {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
    });
    return response.data.access_token;
}
async function run() {
    try {
        const credsPath = '/home/kata/Coding/singleapp/env/sandboxtazagroupvn-83daf10e5feb.json';
        if (!fs.existsSync(credsPath)) {
            console.error('Credentials file not found!');
            return;
        }
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        console.log('Authenticating with service account:', creds.client_email);
        const token = await getGoogleSheetsAccessToken(creds.client_email, creds.private_key);
        console.log('Access token retrieved successfully! Token prefix:', token.slice(0, 15));
        const spreadsheetId = '1G_R_JeKOQhvKj_F_fXmfSfsgIupYyJmgvq22s2Jk7GU';
        console.log('Reading sheet Taza...');
        const readRes = await axios_1.default.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Taza!A1:J15`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        console.log('Taza values:');
        console.log(JSON.stringify(readRes.data.values, null, 2));
        console.log('Reading sheet Timona...');
        const readTimonaRes = await axios_1.default.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Timona!A1:J15`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        console.log('Timona values:');
        console.log(JSON.stringify(readTimonaRes.data.values, null, 2));
    }
    catch (error) {
        console.error('Error in run:', error.response?.data || error.message);
    }
}
run();
//# sourceMappingURL=test-google-sheets.js.map