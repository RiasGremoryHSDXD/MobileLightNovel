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
      addedAt INTEGER
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

export const addToLibrary = (novel: any, sourceId: string) => {
  const statement = db.prepareSync(`
    INSERT OR REPLACE INTO library (novelUrl, title, author, coverUrl, sourceId, addedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  // Handle both possible structures (novel.url or novel.novelUrl)
  const url = novel.url || novel.novelUrl;
  statement.executeSync([url, novel.title, novel.author || '', novel.coverUrl || '', sourceId, Date.now()]);
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
