const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    try {
      const response = await axios.get('https://novelfire.net/search?keyword=shadow', {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      const $ = cheerio.load(response.data);
      console.log('HTML of first item:', $('.novel-item').first().html() || $('a[href^="/book/"]').first().html() || 'Not found');
    } catch (e) { console.error(e.message); }
}
test();
