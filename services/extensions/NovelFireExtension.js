import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://novelfire.net';

export const NovelFireExtension = {
  id: 'novelfire',
  name: 'NovelFire',
  source: 'novelfire.net',
  lang: 'en',
  
  async searchNovel(query) {
    try {
      const url = `${BASE_URL}/search?keyword=${encodeURIComponent(query)}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }
      });

      const $ = cheerio.load(response.data);
      const novels = [];

      $('a[href^="/book/"]').each((i, element) => {
        const title = $(element).find('.novel-title').text().trim() || $(element).attr('title');
        const urlPath = $(element).attr('href');
        let img = $(element).find('img').attr('data-src') || $(element).find('img').attr('src');
        
        let summaryParts = [];
        $(element).find('.novel-stats').each((j, el) => {
          summaryParts.push($(el).text().trim());
        });

        if (title && urlPath) {
          novels.push({
            title: title.trim(),
            coverUrl: img ? `${BASE_URL}${img}` : null,
            novelUrl: `${BASE_URL}${urlPath}`,
            source: 'NovelFire',
            summary: summaryParts.join(' • ')
          });
        }
      });

      const uniqueNovels = [];
      const seenUrls = new Set();
      for (const novel of novels) {
        if (!seenUrls.has(novel.novelUrl)) {
          seenUrls.add(novel.novelUrl);
          uniqueNovels.push(novel);
        }
      }

      return uniqueNovels;
    } catch (error) {
      console.error('Error searching NovelFire:', error);
      return [];
    }
  },

  async getNovelDetails(novelUrl) {
    try {
      const response = await axios.get(novelUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }
      });
      const $ = cheerio.load(response.data);
      
      const title = $('h1.novel-title').text().trim();
      const author = $('div.author span[itemprop="author"]').text().trim();
      const coverUrl = $('.fixed-img img').attr('src') || $('.novel-cover img').attr('src') || $('img.lazy').first().attr('data-src');
      
      let summary = $('.summary .content').text().trim() || $('.summary').text().trim();
      if (summary.startsWith('Summary')) {
        summary = summary.replace('Summary', '').trim();
      }
      summary = summary.replace(/Show more/gi, '').replace(/Show less/gi, '').trim();
      
      const chaptersText = $('.header-stats span:has(.icon-book-open) strong').text().trim() || '0';
      const totalChapters = parseInt(chaptersText.replace(/[^0-9]/g, '')) || 0;
      
      const chapters = [];
      for (let i = 1; i <= totalChapters; i++) {
        chapters.push({
          number: i,
          title: `Chapter ${i}`,
          url: `${novelUrl}/chapter-${i}`
        });
      }

      const genres = [];
      $('.categories a, .novel-categories a, .genres a, .categories ul li a, ul.categories li a, .category a, .categories-list a, .genre-list a, .category-box a, .tags a, .tag a').each((i, el) => {
        const genreText = $(el).text().trim();
        if (genreText) genres.push(genreText);
      });

      return {
        title,
        author: author || 'Unknown',
        coverUrl: coverUrl ? (coverUrl.startsWith('http') ? coverUrl : `${BASE_URL}${coverUrl}`) : null,
        summary: summary || 'No description available.',
        genres,
        chapters: chapters.reverse() 
      };
    } catch (error) {
      console.error('Error fetching novel details:', error);
      return null;
    }
  },

  async getChapterContent(chapterUrl) {
    try {
      const response = await axios.get(chapterUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }
      });
      const $ = cheerio.load(response.data);
      
      const contentNode = $('#chapter-content, .chapter-container, #content, .content, .text-left').first();
      contentNode.find('script, iframe, style, .ad, .advertisement').remove();
      
      let paragraphs = [];
      contentNode.find('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text) paragraphs.push(text);
      });
      
      if (paragraphs.length === 0) {
        // Fallback if no <p> tags are used, split by <br> or newlines
        contentNode.find('br').replaceWith('\n');
        let rawText = contentNode.text().trim();
        paragraphs = rawText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
      }

      return paragraphs.join('\n\n');
    } catch (error) {
      console.error('Error fetching chapter content:', error);
      return 'Error loading chapter content.';
    }
  }
};
