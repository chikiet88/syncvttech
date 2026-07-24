import * as cheerio from 'cheerio';

async function main() {
  const html = await Bun.file('scratch/setting_page_dump.html').text();
  const $ = cheerio.load(html);
  $('script[src]').each((_, el) => {
    console.log($(el).attr('src'));
  });
}

main().catch(console.error);
