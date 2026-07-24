import * as cheerio from 'cheerio';

async function main() {
  const html = await Bun.file('scratch/setting_page_dump.html').text();
  const $ = cheerio.load(html);
  const script22 = $('script').eq(22).html() || '';
  console.log('Script 22 full text:\n', script22);
}

main().catch(console.error);
