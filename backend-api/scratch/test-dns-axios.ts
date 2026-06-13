import axios from 'axios';

async function main() {
  console.log('Testing axios request to VTTech...');
  const start = Date.now();
  try {
    const res = await axios.get('https://tmtaza.vttechsolution.com/Login/Login', {
      timeout: 10000,
    });
    console.log(`Success in ${Date.now() - start}ms! Status: ${res.status}`);
  } catch (err: any) {
    console.error(`Failed after ${Date.now() - start}ms:`, err.message);
  }
}

main();
