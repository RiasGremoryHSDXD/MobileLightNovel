git add .gitignore
git commit -m "Update gitignore: Add custom scratch files to ignore list"

git add app.json package.json package-lock.json
git commit -m "Configure App and Dependencies: Set up Expo SQLite and expo-image for local database storage and disk image caching"

git rm app/(tabs)/two.tsx
git commit -m "Remove unused tab: Clean up boilerplate secondary tab"

git add app/(tabs)/_layout.tsx
git commit -m "Configure Tabs Layout: Set up navigation icons and routes for Library, Updates, History, Browse, and More tabs"

git add app/(tabs)/index.tsx
git commit -m "Implement Library Tab: Display saved novels from SQLite database with a beautiful grid layout"

git add app/(tabs)/browse.tsx
git commit -m "Implement Browse Tab: List available web novel extension sources like NovelFire"

git add app/(tabs)/history.tsx
git commit -m "Implement History Tab: Display recently read novels with timestamps, progress, and instant resume buttons"

git add app/(tabs)/updates.tsx
git commit -m "Implement Updates Tab: Display newly released chapters for novels in the user's library"

git add app/(tabs)/more.tsx
git commit -m "Implement More Tab: Provide settings and utilities like clearing cache and tracking local database storage size"

git add app/source/
git commit -m "Implement Source Browser: Fetch and display popular/latest novels from specific extensions with stale-while-revalidate caching"

git add app/novel/details.tsx
git commit -m "Implement Novel Details Screen: Display novel summary, genres, author, offline downloading, and a searchable chapter list"

git add app/novel/reader.tsx
git commit -m "Implement Chapter Reader: Fetch chapter text content, automatically record reading history, and cleanly render immersive reading UI"

git add services/database/
git commit -m "Implement SQLite Database Layer: Manage persistence for Library novels, Reading History, and API Request Cache"

git add services/extensions/
git commit -m "Implement Extension Manager: Create modular web scraping logic for NovelFire to fetch novel metadata and chapters"

git add services/parsers/BoxNovelParser.js
git commit -m "Update BoxNovel Parser: Refine scraping methods for generic madara novel sites"

git add chapter1.html novelfire_home.html testHtml.js testSyn.js
git commit -m "Add Scraper Test Scripts: Include debugging scratch files and local HTML dumps used during scraper development"

git branch -M main
git remote add origin https://github.com/RiasGremoryHSDXD/MobileLightNovel.git
git push -u origin main
