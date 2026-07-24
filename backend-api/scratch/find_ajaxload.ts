import * as cheerio from 'cheerio';

async function main() {
  const html = await Bun.file('scratch/setting_page_dump.html').text();
  const $ = cheerio.load(html);

  $('script').each((i, el) => {
    const text = $(el).html() || '';
    if (text.includes('AjaxLoad')) {
      console.log(`Script #${i} has AjaxLoad:`);
      const idx = text.indexOf('AjaxLoad');
      console.log(text.substring(Math.max(0, idx - 100), idx + 500));
    }
  });
}

main().catch(console.error);
