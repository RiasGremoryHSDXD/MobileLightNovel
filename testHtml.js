const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    try {
      const response = await axios.get('https://novelfire.net/search?keyword=', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }
      });
      const $ = cheerio.load(response.data);
      console.log($('.novel-item').first().html());
    } catch (e) { console.error(e.message); }
}
test();
