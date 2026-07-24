import axios from 'axios';

async function main() {
  const baseUrl = 'https://tmtaza.vttechsolution.com';
  const files = [
    '/js/comon/initialize_setting.js',
    '/js/comon/master.js',
    '/js/master.js',
    '/js/comon/comon.js'
  ];

  for (const f of files) {
    try {
      const res = await axios.get(`${baseUrl}${f}`, { validateStatus: () => true });
      console.log(`\n--- ${f} (Status: ${res.status}, Length: ${res.data?.length}) ---`);
      if (res.status === 200 && typeof res.data === 'string') {
        const idx = res.data.indexOf('AjaxLoad');
        if (idx !== -1) {
          console.log(`FOUND AjaxLoad in ${f}!`);
          console.log(res.data.substring(idx, idx + 1200));
        }
      }
    } catch (e: any) {
      console.log(`Error ${f}: ${e.message}`);
    }
  }
}

main().catch(console.error);
