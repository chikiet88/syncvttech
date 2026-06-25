import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';

const spreadsheetId = '1G_R_JeKOQhvKj_F_fXmfSfsgIupYyJmgvq22s2Jk7GU';

async function getGoogleSheetsAccessToken(clientEmail: string, privateKey: string): Promise<string> {
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

  return response.data.access_token;
}

async function main() {
  const creds = JSON.parse(fs.readFileSync('./google-service-account.json', 'utf8'));
  const token = await getGoogleSheetsAccessToken(creds.client_email, creds.private_key);
  
  const response = await axios.get(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Taza!C:C`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const rows = response.data.values || [];
  console.log(`Total rows: ${rows.length}`);
  
  const dateCounts: Record<string, number> = {};
  for (let i = 1; i < rows.length; i++) {
    const val = rows[i]?.[0];
    if (val) {
      dateCounts[val] = (dateCounts[val] || 0) + 1;
    }
  }
  
  console.log("\nLast 15 dates with row counts in sheet:");
  const uniqueDates = Object.keys(dateCounts).sort((a,b) => {
    const parse = (dStr: string) => {
      const [d,m,y] = dStr.split('-');
      return new Date(`${y}-${m}-${d}`).getTime();
    };
    return parse(a) - parse(b);
  });
  
  uniqueDates.slice(-15).forEach(d => {
    console.log(`- Date: ${d} | Count: ${dateCounts[d]} rows`);
  });
}

main().catch(console.error);
