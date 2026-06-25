import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';

const spreadsheetId = '1pjsiXsQYYpS6ebn4erJxfa3PAHZHURvAdXxeQkSy-Bg';

async function getGoogleSheetsAccessToken(clientEmail: string, privateKey: string): Promise<string> {
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
  return response.data.access_token;
}

async function main() {
  const creds = JSON.parse(fs.readFileSync('./google-service-account.json', 'utf8'));
  const token = await getGoogleSheetsAccessToken(creds.client_email, creds.private_key);

  console.log('Fetching spreadsheet metadata...');
  const metaResponse = await axios.get(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const sheets = metaResponse.data.sheets || [];
  const batchRequests: any[] = [];

  for (const sheet of sheets) {
    const title = sheet.properties.title;
    const sheetId = sheet.properties.sheetId;
    const rowCount = sheet.properties.gridProperties?.rowCount || 0;
    const colCount = sheet.properties.gridProperties?.columnCount || 0;
    console.log(`Sheet "${title}" (ID: ${sheetId}): rows = ${rowCount}, cols = ${colCount}, total cells = ${rowCount * colCount}`);

    // If colCount > 10, resize to 10
    if (colCount > 10) {
      console.log(`Scheduling resize of "${title}" to 10 columns.`);
      batchRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheetId,
            gridProperties: {
              columnCount: 10
            }
          },
          fields: 'gridProperties.columnCount'
        }
      });
    }
  }

  if (batchRequests.length > 0) {
    console.log('Sending batch update to resize columns...');
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      { requests: batchRequests },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log('Resized columns successfully!');
  } else {
    console.log('No sheets needed column resizing.');
  }
}

main().catch(console.error);
