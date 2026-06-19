import * as cheerio from 'cheerio';

const BASE_URL = 'https://novelfire.net';

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
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

export const NovelFireExtension = {
  id: 'novelfire',
  name: 'NovelFire',
  source: 'novelfire.net',
  lang: 'en',

  _parseNovelList($) {
    const novels = [];
    $('ul.novel-list li.novel-item').each((i, element) => {
      const anchor = $(element).find('a').first();
      const href = anchor.attr('href');
      const title = $(element).find('h4.novel-title').text().trim() || anchor.attr('title')?.trim();
      let img = $(element).find('figure.novel-cover img').attr('data-src') || $(element).find('figure.novel-cover img').attr('src');
      if (img && img.startsWith('data:')) img = null;

      if (title && href) {
        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        novels.push({
          title,
          coverUrl: img ? (img.startsWith('http') ? img : `${BASE_URL}${img}`) : null,
          novelUrl: fullUrl,
          source: 'NovelFire',
        });
      }
    });
    return novels;
  },

  async searchNovel(query) {
    try {
      const url = `${BASE_URL}/search?keyword=${encodeURIComponent(query)}`;
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      return this._parseNovelList($);
    } catch (error) {
      console.error('Error searching NovelFire:', error);
      return [];
    }
  },

  async getPopularNovels(page = 1) {
    try {
      const url = `${BASE_URL}/genre-all/sort-popular/status-all/all-novel?page=${page}`;
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      return this._parseNovelList($);
    } catch (error) {
      console.error('Error fetching popular novels from NovelFire:', error);
      return [];
    }
  },

  async getLatestUpdates(page = 1) {
    try {
      const url = `${BASE_URL}/latest-release-novels?page=${page}`;
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      return this._parseNovelList($);
    } catch (error) {
      console.error('Error fetching latest updates from NovelFire:', error);
      return [];
    }
  },

  async getNovelDetails(novelUrl) {
    try {
      const html = await fetchHtml(novelUrl);
      const $ = cheerio.load(html);

      // Title: <h1 class="novel-title"> or <h1 itemprop="name">
      const title = $('h1.novel-title, h1[itemprop="name"]').text().trim();

      // Author: inside .novel-info .author
      const author = $('.novel-info .author a').text().trim()
        || $('.author').text().replace('Author:', '').trim();

      // Cover image: <figure class="cover"> img
      const coverUrl = $('figure.cover img').attr('src')
        || $('figure.cover img').attr('data-src');

      // Summary
      let summary = $('.summary .content').text().trim()
        || $('.summary').text().trim()
        || $('.description').text().trim();
      summary = summary.replace(/Show more/gi, '').replace(/Show less/gi, '').trim();

      // Chapter count: inside .header-stats, look for the element labelled "Chapters"
      // Structure: <div class="header-stats"><span><strong>3050</strong> Chapters</span>...
      let totalChapters = 0;
      $('.header-stats span').each((i, el) => {
        const text = $(el).text();
        if (text.toLowerCase().includes('chapter')) {
          const num = parseInt($(el).find('strong').text().replace(/[^0-9]/g, ''));
          if (!isNaN(num) && num > 0) totalChapters = num;
        }
      });

      // Build chapter list from 1 to totalChapters
      // NovelFire uses /book/<slug>/chapter-<n> format
      const chapters = [];
      for (let i = 1; i <= totalChapters; i++) {
        chapters.push({
          number: i,
          title: `Chapter ${i}`,
          url: `${novelUrl}/chapter-${i}`,
        });
      }

      // Genres: <div class="categories"> <a> tags
      const genres = [];
      $('.categories a, a[href*="/genre-"]').each((i, el) => {
        const g = $(el).text().trim();
        if (g) genres.push(g);
      });

      return {
        title,
        author: author || 'Unknown',
        coverUrl: coverUrl
          ? (coverUrl.startsWith('http') ? coverUrl : `${BASE_URL}${coverUrl}`)
          : null,
        summary: summary || 'No description available.',
        genres: [...new Set(genres)], // deduplicate
        chapters: chapters.reverse(), // newest first
      };
    } catch (error) {
      console.error('Error fetching novel details:', error);
      return null;
    }
  },

  async getChapterContent(chapterUrl) {
    try {
      const html = await fetchHtml(chapterUrl);
      const $ = cheerio.load(html);

      const contentNode = $('#chapter-content, .chapter-container, #content, .content, .text-left').first();
      contentNode.find('script, iframe, style, .ad, .advertisement').remove();

      let paragraphs = [];
      contentNode.find('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text) paragraphs.push(text);
      });

      if (paragraphs.length === 0) {
        contentNode.find('br').replaceWith('\n');
        const rawText = contentNode.text().trim();
        paragraphs = rawText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
      }

      return paragraphs.join('\n\n');
    } catch (error) {
      console.error('Error fetching chapter content:', error);
      return 'Error loading chapter content.';
    }
  },
};
