import * as cheerio from 'cheerio';

async function main() {
  const html = await Bun.file('scratch/ticket_source_list.html').text();
  const $ = cheerio.load(html);
  const script0 = $('script').eq(0).html() || '';
  
  const idx = script0.indexOf('function LoadTicketSourceAjax');
  if (idx !== -1) {
    console.log(script0.substring(idx, idx + 1000));
  } else {
    console.log('Not found in script 0, searching all text...');
    $('script').each((i, el) => {
      const text = $(el).html() || '';
      if (text.includes('LoadTicketSourceAjax')) {
        const j = text.indexOf('LoadTicketSourceAjax');
        console.log(`In script #${i}:\n`, text.substring(j, j + 800));
      }
    });
  }
}

main().catch(console.error);
