import { BoxNovelParser } from '../parsers/BoxNovelParser';
import { NovelFireExtension } from './NovelFireExtension';

export const ExtensionManager = {
  extensions: [
    NovelFireExtension,
    {
      id: 'boxnovel',
      name: 'BoxNovel',
      source: 'boxnovel.com',
      lang: 'en',
      searchNovel: BoxNovelParser.searchNovel,
      getPopularNovels: async () => [],
      getLatestUpdates: async () => [],
      getNovelDetails: async () => null,
      getChapterContent: async () => "Content not implemented yet for BoxNovel."
    }
  ],
  
  getExtension(id) {
    return this.extensions.find(ext => ext.id === id);
  }
};
