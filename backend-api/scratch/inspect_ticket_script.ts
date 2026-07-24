import * as cheerio from 'cheerio';

async function main() {
  const html = await Bun.file('scratch/ticket_source_list.html').text();
  const $ = cheerio.load(html);
  const script0 = $('script').eq(0).html() || '';
  console.log('Script 0 full content:\n', script0);
}

main().catch(console.error);
