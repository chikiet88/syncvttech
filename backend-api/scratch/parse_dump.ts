import * as cheerio from 'cheerio';

async function main() {
  const html = await Bun.file('scratch/setting_page_dump.html').text();
  const $ = cheerio.load(html);

  console.log('--- Inputs ---');
  $('input').each((_, el) => {
    console.log($(el).attr('name') || $(el).attr('id'), ':', $(el).attr('value'));
  });

  console.log('\n--- Script contents containing "Load", "Data", "nguon", "Param", "Setting" ---');
  $('script').each((i, el) => {
    const text = $(el).html() || '';
    if (text.includes('slug') || text.includes('Load') || text.includes('setting') || text.includes('Nguon') || text.includes('Source')) {
      console.log(`\nScript #${i} (Length: ${text.length}):`);
      console.log(text.substring(0, 1000));
    }
  });

  console.log('\n--- Buttons or Links with onclick / href ---');
  $('[onclick]').each((_, el) => {
    console.log('onclick:', $(el).attr('onclick'), '| text:', $(el).text().trim());
  });
}

main().catch(console.error);
