const cheerio = require('cheerio');
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

async function fetchHtml(url) {
  const response = await fetch(url, { headers: HEADERS });
  return response.text();
}

async function run() {
  try {
    const html = await fetchHtml('https://novelfire.net/book/shadow-slave');
    const $ = cheerio.load(html);
    console.log('rating HTML:', $('.rating').html());
    console.log('RANK HTML:', $('.novel-info').html().match(/RANK[\s\S]*?(?=<)/g));
    console.log('4.6 html', $('.novel-info *').filter(function() { return $(this).text().includes('4.6'); }).first().parent().html());
  } catch (e) {
    console.error(e);
  }
}
run();
