import axios from 'axios';

async function main() {
  const baseUrl = 'https://tmtaza.vttechsolution.com';
  const res = await axios.get(`${baseUrl}/js/main.js`);
  const text = res.data;
  console.log('main.js length:', text.length);

  const idx = text.indexOf('AjaxLoad');
  if (idx !== -1) {
    console.log('\n--- Found AjaxLoad in main.js ---');
    console.log(text.substring(idx, idx + 1500));
  } else {
    console.log('AjaxLoad not found in main.js');
  }
}

main().catch(console.error);
