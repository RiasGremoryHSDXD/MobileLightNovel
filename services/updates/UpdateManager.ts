import { getLibrary, updateLibraryTotalChapters, addUpdate, setCache } from '../database/Database';
import { ExtensionManager } from '../extensions/ExtensionManager';

export const checkForUpdates = async (isBackground: boolean = false): Promise<number> => {
  const library = getLibrary();
  let totalNewChapters = 0;

  // Limit background updates to the first 30 library items to prevent OS timeout
  const targetLibrary = isBackground ? (library as any[]).slice(0, 30) : library;

  for (const novel of targetLibrary as any[]) {
    try {
      const extension = ExtensionManager.getExtension(novel.sourceId);
      if (!extension) continue;

      // Silently fetch the latest novel details from the source
      const details = await extension.getNovelDetails(novel.novelUrl);
      
      if (!details || !details.chapters) continue;

      const currentTotal = details.chapters.length;
      const previousTotal = novel.totalChapters || 0;

      // If new chapters are found
      if (currentTotal > previousTotal) {
        
        // If previousTotal is 0, this is a legacy novel added before the updates feature.
        // We shouldn't spam the user with thousands of old chapters. 
        // We just update the totalChapters silently.
        if (previousTotal > 0) {
          const newChaptersCount = currentTotal - previousTotal;
          const newChapters = details.chapters.slice(0, newChaptersCount);
          
          for (const chapter of newChapters) {
            addUpdate(
              novel.novelUrl,
              novel.title,
              novel.coverUrl,
              chapter.url,
              chapter.title,
              novel.sourceId
            );
            totalNewChapters++;
          }
        }

        // Update the library's total chapters so we don't notify them again for these
        updateLibraryTotalChapters(novel.novelUrl, currentTotal);
        
        // Cache the fresh novel details so the Library/Details screen loads instantly!
        setCache(`novel_details_${novel.novelUrl}`, details);
      }
    } catch (e) {
      console.log(`Failed to check updates for ${novel.title}`, e);
    }
  }

  return totalNewChapters;
};
