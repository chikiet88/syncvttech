import * as crypto from 'crypto';
import * as fs from 'fs';
import axios from 'axios';

async function main() {
  const credsPath = '/home/kata/Coding/singleapp/env/sandboxtazagroupvn-83daf10e5feb.json';
  if (!fs.existsSync(credsPath)) {
    console.error('Credentials file not found:', credsPath);
    return;
  }
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  const clientEmail = creds.client_email;
  const privateKey = creds.private_key;

  // Authenticate
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: any) => {
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

  const response = await axios.post('https://oauth2.googleapis.com/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });

  const token = response.data.access_token;
  const spreadsheetId = '1xVkxWUPUSsfZ64Jhov5k3EOTrXT-QT3_PpNNSFFqFvI';

  const sheetInfo = await axios.get(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  console.log('Spreadsheet Sheets:');
  sheetInfo.data.sheets.forEach((s: any) => {
    console.log(`- Title: "${s.properties.title}", ID: ${s.properties.sheetId}`);
  });
}

main().catch(console.error);
