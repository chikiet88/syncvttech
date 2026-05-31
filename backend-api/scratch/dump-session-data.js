const { VttechApiService } = require('../dist/src/vttech-api.service');
const { ConfigService } = require('@nestjs/config');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const configService = new ConfigService();
  const vttechApi = new VttechApiService(configService);

  console.log('Logging in and calling SessionData...');
  try {
    const res = await vttechApi.callApi('/api/Home/SessionData', {});
    
    if (!res) {
      console.log('SessionData response is empty');
      return;
    }

    console.log('SessionData Keys:', Object.keys(res));
    
    for (const key of Object.keys(res)) {
      if (Array.isArray(res[key])) {
        console.log(`Key ${key}: Array of length ${res[key].length}`);
        if (res[key].length > 0) {
          console.log(`Sample object from ${key}:`, JSON.stringify(res[key][0], null, 2));
        }
      } else {
        console.log(`Key ${key}: Type ${typeof res[key]}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
