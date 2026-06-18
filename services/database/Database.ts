import * as SQLite from 'expo-sqlite';

// Open the local database synchronously
const db = SQLite.openDatabaseSync('lightnovel.db');

export const initDB = () => {
  // Create Library table if it doesn't exist
  db.execSync(`
    CREATE TABLE IF NOT EXISTS library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novelUrl TEXT UNIQUE,
      title TEXT,
      author TEXT,
      coverUrl TEXT,
      sourceId TEXT,
      addedAt INTEGER,
      totalChapters INTEGER DEFAULT 0
    );
  `);

  try {
    db.execSync('ALTER TABLE library ADD COLUMN totalChapters INTEGER DEFAULT 0;');
  } catch (e) {
    // Ignore if column already exists
  }

  // Create Updates table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novelUrl TEXT,
      novelTitle TEXT,
      novelCover TEXT,
      chapterUrl TEXT UNIQUE, 
      chapterTitle TEXT,
      sourceId TEXT,
      discoveredAt INTEGER,
      isRead BOOLEAN DEFAULT 0
    );
  `);

  // Create Universal JSON Cache table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS request_cache (
      key TEXT PRIMARY KEY,
      data TEXT,
      timestamp INTEGER
    );
  `);

  // Create Reading History table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novelUrl TEXT UNIQUE,
      title TEXT,
      coverUrl TEXT,
      sourceId TEXT,
      lastReadChapterUrl TEXT,
      lastReadChapterTitle TEXT,
      lastReadAt INTEGER
    );
  `);

  // Create Categories table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sortOrder INTEGER DEFAULT 0,
      isSystemDefault BOOLEAN DEFAULT 0
    );
  `);

  // Populate default categories if empty
  const categoryCount = db.getFirstSync<{count: number}>('SELECT COUNT(*) as count FROM categories;');
  if (categoryCount && categoryCount.count === 0) {
    const defaultCategories = [
      { name: 'Default', isSystem: 1 },
      { name: 'Currently Reading', isSystem: 1 },
      { name: 'Completed', isSystem: 1 },
      { name: 'Plan to Read', isSystem: 1 },
      { name: 'Dropped', isSystem: 1 }
    ];
    
    defaultCategories.forEach((cat, index) => {
      db.execSync(`INSERT INTO categories (name, sortOrder, isSystemDefault) VALUES ('${cat.name}', ${index}, ${cat.isSystem})`);
    });
  }

  // Add categoryId to library table
  try {
    db.execSync('ALTER TABLE library ADD COLUMN categoryId INTEGER DEFAULT 1;');
  } catch (e) {
    // Ignore if column already exists
  }
};

// Ensure tables are always created instantly on app startup
initDB();

// --- Cache Functions ---

export const setCache = (key: string, data: any) => {
  const statement = db.prepareSync('INSERT OR REPLACE INTO request_cache (key, data, timestamp) VALUES (?, ?, ?)');
  statement.executeSync([key, JSON.stringify(data), Date.now()]);
};

export const getCache = (key: string) => {
  const statement = db.prepareSync('SELECT data FROM request_cache WHERE key = ? LIMIT 1');
  const result = statement.executeSync([key]);
  const rows = result.getAllSync();
  if (rows.length > 0) return JSON.parse((rows[0] as any).data);
  return null;
};

export const getDownloadedChapterUrls = (urls: string[]): Set<string> => {
  if (urls.length === 0) return new Set();
  
  // SQLite has a max variable limit (usually 999), so we chunk the array
  const downloaded = new Set<string>();
  const chunkSize = 500;
  
  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk = urls.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '?').join(',');
    const statement = db.prepareSync(`SELECT key FROM request_cache WHERE key IN (${placeholders})`);
    const result = statement.executeSync(chunk);
    const rows = result.getAllSync();
    for (const row of rows) {
      downloaded.add((row as any).key);
    }
  }
  return downloaded;
};

export const clearRequestCache = () => {
  db.execSync('DELETE FROM request_cache;');
  db.execSync('VACUUM;'); // Shrink the database file and release storage back to the OS
};

export const getDatabaseSizeInBytes = (): number => {
  try {
    const pageCount = db.getFirstSync<{page_count: number}>('PRAGMA page_count;');
    const pageSize = db.getFirstSync<{page_size: number}>('PRAGMA page_size;');
    if (pageCount && pageSize) {
      return pageCount.page_count * pageSize.page_size;
    }
  } catch (e) {
    console.error(e);
  }
  return 0;
};

// --- Library Functions ---

export const addToLibrary = (novel: any, sourceId: string, targetCategoryId?: number) => {
  // Handle both possible structures (novel.url or novel.novelUrl)
  const url = novel.url || novel.novelUrl;
  
  // Try to preserve existing categoryId if it's already in the library
  let categoryId = targetCategoryId !== undefined ? targetCategoryId : 1;
  if (targetCategoryId === undefined) {
    try {
      const statement = db.prepareSync('SELECT categoryId FROM library WHERE novelUrl = ?');
      const result = statement.executeSync([url]);
      const rows = result.getAllSync() as {categoryId: number}[];
      if (rows && rows.length > 0 && rows[0].categoryId) {
        categoryId = rows[0].categoryId;
      }
    } catch(e) {}
  }

  const statement = db.prepareSync(`
    INSERT OR REPLACE INTO library (novelUrl, title, author, coverUrl, sourceId, addedAt, totalChapters, categoryId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const totalChapters = novel.chapters ? novel.chapters.length : 0;
  statement.executeSync([url, novel.title, novel.author || '', novel.coverUrl || '', sourceId, Date.now(), totalChapters, categoryId]);
};

export const removeFromLibrary = (novelUrl: string) => {
  const statement = db.prepareSync('DELETE FROM library WHERE novelUrl = ?');
  statement.executeSync([novelUrl]);
};

export const isInLibrary = (novelUrl: string): boolean => {
  const statement = db.prepareSync('SELECT 1 FROM library WHERE novelUrl = ? LIMIT 1');
  const result = statement.executeSync([novelUrl]);
  return result.getAllSync().length > 0;
};

// --- History Functions ---

export const addToHistory = (novelUrl: string, title: string, coverUrl: string, sourceId: string, chapterUrl: string, chapterTitle: string) => {
  const statement = db.prepareSync('INSERT OR REPLACE INTO history (novelUrl, title, coverUrl, sourceId, lastReadChapterUrl, lastReadChapterTitle, lastReadAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
  statement.executeSync([novelUrl, title, coverUrl, sourceId, chapterUrl, chapterTitle, Date.now()]);
};

export const getHistory = () => {
  const statement = db.prepareSync('SELECT * FROM history ORDER BY lastReadAt DESC');
  const result = statement.executeSync();
  return result.getAllSync();
};

export const removeFromHistory = (novelUrl: string) => {
  const statement = db.prepareSync('DELETE FROM history WHERE novelUrl = ?');
  statement.executeSync([novelUrl]);
};

export const clearHistory = () => {
  db.execSync('DELETE FROM history;');
  db.execSync('VACUUM;');
};

export const getLibrary = () => {
  const statement = db.prepareSync('SELECT * FROM library ORDER BY addedAt DESC');
  const result = statement.executeSync();
  return result.getAllSync();
};

export const updateLibraryTotalChapters = (novelUrl: string, totalChapters: number) => {
  const statement = db.prepareSync('UPDATE library SET totalChapters = ? WHERE novelUrl = ?');
  statement.executeSync([totalChapters, novelUrl]);
};

// --- Updates Functions ---

export const getUpdates = () => {
  const statement = db.prepareSync('SELECT * FROM updates ORDER BY discoveredAt DESC');
  const result = statement.executeSync();
  return result.getAllSync();
};

export const getUnreadUpdatesCount = (): number => {
  try {
    const statement = db.prepareSync('SELECT COUNT(*) as count FROM updates WHERE isRead = 0');
    const result = statement.executeSync();
    const rows = result.getAllSync();
    if (rows.length > 0) return (rows[0] as any).count;
  } catch(e) {
    console.error(e);
  }
  return 0;
};

export const addUpdate = (novelUrl: string, novelTitle: string, novelCover: string, chapterUrl: string, chapterTitle: string, sourceId: string) => {
  try {
    const statement = db.prepareSync(`
      INSERT INTO updates (novelUrl, novelTitle, novelCover, chapterUrl, chapterTitle, sourceId, discoveredAt, isRead)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);
    statement.executeSync([novelUrl, novelTitle, novelCover, chapterUrl, chapterTitle, sourceId, Date.now()]);
  } catch(e) {
    // Ignore error if chapterUrl already exists (UNIQUE constraint)
  }
};

export const markUpdateAsRead = (chapterUrl: string) => {
  const statement = db.prepareSync('UPDATE updates SET isRead = 1 WHERE chapterUrl = ?');
  statement.executeSync([chapterUrl]);
};

export const clearUpdates = () => {
  db.execSync('DELETE FROM updates;');
  db.execSync('VACUUM;');
};

// --- Category Functions ---

export const getCategories = () => {
  const statement = db.prepareSync('SELECT * FROM categories ORDER BY sortOrder ASC');
  const result = statement.executeSync();
  return result.getAllSync();
};

export const addCategory = (name: string) => {
  const result = db.getFirstSync<{maxSort: number}>('SELECT MAX(sortOrder) as maxSort FROM categories');
  const nextSort = (result?.maxSort || 0) + 1;
  const statement = db.prepareSync('INSERT INTO categories (name, sortOrder, isSystemDefault) VALUES (?, ?, 0)');
  statement.executeSync([name, nextSort]);
};

export const deleteCategory = (id: number) => {
  try {
    // 1. Move all novels to Default category (id = 1) ONLY if the category to delete is NOT a system default
    const moveStatement = db.prepareSync(`
      UPDATE library 
      SET categoryId = 1 
      WHERE categoryId = ? 
      AND (SELECT isSystemDefault FROM categories WHERE id = ?) = 0
    `);
    moveStatement.executeSync([id, id]);

    // 2. Delete the category ONLY if it is NOT a system default
    const delStatement = db.prepareSync('DELETE FROM categories WHERE id = ? AND isSystemDefault = 0');
    delStatement.executeSync([id]);
  } catch (e) {
    console.error('Error deleting category:', e);
  }
};

export const updateCategoryOrder = (categories: {id: number, sortOrder: number}[]) => {
  const statement = db.prepareSync('UPDATE categories SET sortOrder = ? WHERE id = ?');
  for (const cat of categories) {
    statement.executeSync([cat.sortOrder, cat.id]);
  }
};

export const renameCategory = (id: number, newName: string) => {
  const statement = db.prepareSync('UPDATE categories SET name = ? WHERE id = ? AND isSystemDefault = 0');
  statement.executeSync([newName, id]);
};

export const changeNovelCategory = (novelUrl: string, categoryId: number) => {
  const statement = db.prepareSync('UPDATE library SET categoryId = ? WHERE novelUrl = ?');
  statement.executeSync([categoryId, novelUrl]);
};
