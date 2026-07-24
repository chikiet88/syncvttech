import axios from 'axios';

async function main() {
  const baseUrl = 'https://tmtaza.vttechsolution.com';
  const files = [
    '/js/Bundle/MasterSettingLocal.js',
    '/js/Preload/preload.js',
    '/js/Bundle/bundle_files.js'
  ];

  for (const f of files) {
    try {
      const res = await axios.get(`${baseUrl}${f}`, { validateStatus: () => true });
      console.log(`\n--- ${f} (Status: ${res.status}, Length: ${res.data?.length}) ---`);
      if (res.status === 200 && typeof res.data === 'string') {
        const idx = res.data.indexOf('function AjaxLoad');
        if (idx !== -1) {
          console.log(`FOUND function AjaxLoad in ${f}!`);
          console.log(res.data.substring(idx, idx + 1200));
        } else {
          const idx2 = res.data.indexOf('AjaxLoad');
          if (idx2 !== -1) {
            console.log(`FOUND AjaxLoad mention in ${f}:`);
            console.log(res.data.substring(idx2, idx2 + 500));
          }
        }
      }
    } catch (e: any) {
      console.log(`Error ${f}: ${e.message}`);
    }
  }
}

main().catch(console.error);
