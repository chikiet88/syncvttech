import axios from 'axios';
import * as cheerio from 'cheerio';

async function main() {
  const baseUrl = 'https://tmtaza.vttechsolution.com';
  const loginRes = await axios.get(`${baseUrl}/Login/Login`);
  const $ = cheerio.load(loginRes.data);

  const scripts: string[] = [];
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) scripts.push(src);
  });

  console.log('Found scripts:', scripts);

  for (const src of scripts) {
    const fullUrl = src.startsWith('http') ? src : `${baseUrl}${src.startsWith('/') ? '' : '/'}${src}`;
    try {
      const res = await axios.get(fullUrl);
      if (typeof res.data === 'string' && res.data.includes('AjaxLoad')) {
        console.log(`\n================ FOUND AjaxLoad IN ${src} ================`);
        const idx = res.data.indexOf('AjaxLoad');
        console.log(res.data.substring(idx, idx + 1000));
      }
    } catch {}
  }
}

main().catch(console.error);
