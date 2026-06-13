import * as crypto from 'crypto';
import * as fs from 'fs';
import axios from 'axios';

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
  
  // Format private key (replace literal \n if loaded from env string)
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
    
    // Read the first 15 rows from Taza
    console.log('Reading sheet Taza...');
    const readRes = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Taza!A1:J15`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log('Taza values:');
    console.log(JSON.stringify(readRes.data.values, null, 2));

    // Read the first 15 rows from Timona
    console.log('Reading sheet Timona...');
    const readTimonaRes = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Timona!A1:J15`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log('Timona values:');
    console.log(JSON.stringify(readTimonaRes.data.values, null, 2));

  } catch (error: any) {
    console.error('Error in run:', error.response?.data || error.message);
  }
}

run();
