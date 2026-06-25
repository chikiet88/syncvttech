import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';

const spreadsheetId = '1pjsiXsQYYpS6ebn4erJxfa3PAHZHURvAdXxeQkSy-Bg';

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
  console.log(`Checking spreadsheet metadata for: ${spreadsheetId}`);
  
  // Load credentials
  const creds = JSON.parse(fs.readFileSync('./google-service-account.json', 'utf8'));
  const token = await getGoogleSheetsAccessToken(creds.client_email, creds.private_key);
  
  // Get spreadsheet metadata
  const metaResponse = await axios.get(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  const sheets = metaResponse.data.sheets || [];
  console.log(`Spreadsheet Title: ${metaResponse.data.properties?.title}`);
  console.log('Sheets:');
  for (const sheet of sheets) {
    const title = sheet.properties.title;
    console.log(`- Tab: "${title}" | ID: ${sheet.properties.sheetId}`);
    
    try {
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(title)}!A:D`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const rows = response.data.values || [];
      console.log(`  Total rows returned by API: ${rows.length}`);
      if (rows.length > 0) {
        console.log(`  Header row:`, rows[0]);
        // Find last non-empty row
        let lastIndex = rows.length - 1;
        while (lastIndex >= 0 && (!rows[lastIndex] || rows[lastIndex].length === 0 || !rows[lastIndex][0])) {
          lastIndex--;
        }
        if (lastIndex >= 0) {
          console.log(`  Last non-empty row (Row ${lastIndex + 1}):`, rows[lastIndex]);
        }
      }
    } catch (e: any) {
      console.log(`  Failed to read: ${e.message}`);
    }
  }
}

main().catch(console.error);
