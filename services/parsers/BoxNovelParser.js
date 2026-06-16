import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://boxnovel.com';

/**
 * A basic scraper "Extension" for BoxNovel.
 * This demonstrates how we turn a website into JSON data for our app.
 */
export const BoxNovelParser = {
  name: 'BoxNovel',
  
  /**
   * Search for a novel
   * @param {string} query 
   * @returns Array of novel objects
   */
  searchNovel: async (query) => {
    try {
      // Note: BoxNovel uses a specific search URL structure, this is an example
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });
      const $ = cheerio.load(response.data);
      
      const results = [];
      
      // We look for the standard manga/novel item container
      $('.c-tabs-item__content').each((i, element) => {
        const titleElement = $(element).find('.post-title h3 a');
        const title = titleElement.text().trim();
        const novelUrl = titleElement.attr('href');
        const coverUrl = $(element).find('img').attr('src') || $(element).find('img').attr('data-src');
        
        if (title && novelUrl) {
          results.push({
            title,
            url: novelUrl,
            coverUrl,
            source: 'BoxNovel'
          });
        }
      });
      
      return results;
    } catch (error) {
      console.error("Error searching novel:", error);
      return [];
    }
  },

  /**
   * Get details for a specific novel
   * @param {string} novelUrl 
   */
  getNovelDetails: async (novelUrl) => {
    try {
      const response = await axios.get(novelUrl);
      const $ = cheerio.load(response.data);
      
      const title = $('.post-title h1').text().trim();
      const author = $('.author-content a').text().trim();
      const coverUrl = $('.summary_image img').attr('src') || $('.summary_image img').attr('data-src');
      
      // Clean up description (remove ads and unnecessary tags)
      const description = $('.summary__content p').text().trim() || $('.description-summary .summary__content').text().trim();
      
      return {
        title,
        author,
        coverUrl,
        description,
        source: 'BoxNovel',
        url: novelUrl
      };
    } catch (error) {
      console.error("Error getting novel details:", error);
      return null;
    }
  },

  /**
   * Get the list of chapters for a novel
   * @param {string} novelUrl 
   */
  getChapterList: async (novelUrl) => {
    try {
      // Some sites require a POST request to an admin-ajax.php endpoint for chapters,
      // but let's assume a simpler site structure for this example.
      // BoxNovel often puts chapters directly in the page or loads via ajax.
      // We will do a generic scrape of `.wp-manga-chapter`
      
      const response = await axios.get(novelUrl);
      const $ = cheerio.load(response.data);
      
      const chapters = [];
      
      $('.wp-manga-chapter a').each((i, element) => {
        const title = $(element).text().trim();
        const url = $(element).attr('href');
        
        // They are usually listed descending, so we might want to reverse them later
        if (title && url) {
          chapters.push({
            title,
            url
          });
        }
      });
      
      return chapters;
    } catch (error) {
      console.error("Error getting chapter list:", error);
      return [];
    }
  },

  /**
   * Fetch the actual text of a chapter for reading/downloading
   * @param {string} chapterUrl 
   */
  getChapterContent: async (chapterUrl) => {
    try {
      const response = await axios.get(chapterUrl);
      const $ = cheerio.load(response.data);
      
      // BoxNovel puts the reading text inside .reading-content
      const contentContainer = $('.reading-content');
      
      // Remove annoying ads, scripts, or banners
      contentContainer.find('script, iframe, .code-block, .adsbygoogle').remove();
      
      // We can return raw HTML to render via react-native-render-html,
      // or we can extract just the text. Let's return clean HTML.
      return contentContainer.html();
      
    } catch (error) {
      console.error("Error getting chapter content:", error);
      return null;
    }
  }
};
