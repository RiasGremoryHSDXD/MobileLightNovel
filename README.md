# 📱 Mobile Light Novel Reader

A sleek, performant, and fully featured Light Novel reading application built with **React Native** and **Expo**. It functions similarly to popular manga/novel reader apps (like Tachiyomi/Mihon), allowing users to browse web novel sources, read chapters with a clean immersive UI, and save novels to their local library.

## ✨ Features

- **🌐 Extension System:** Dynamically parse and scrape novel sites. Currently includes a fully working extension for parsing `NovelFire` (Extracting metadata, genres, summaries, and chapter lists).
- **📚 Personal Library:** Save your favorite novels into your offline library. Data is stored locally via `expo-sqlite`.
- **📖 Immersive Reader:** A clean, minimal reader UI with no distractions.
- **💾 Offline Downloading:** You can manually download specific chapters. Downloaded chapters are instantly saved to the SQLite database, completely bypassing the internet when opened later.
- **🕒 Reading History:** Automatically tracks exactly what chapter you were reading and when. Includes a dedicated History tab with an instant "Resume" button to teleport you exactly where you left off.
- **⚡ Stale-While-Revalidate Caching:** Almost everything (novel details, cover images, chapter lists) is cached dynamically to ensure lightning-fast UI loads while fetching fresh data in the background.

## 🛠️ Tech Stack

- **Framework:** React Native / Expo Router (v51)
- **Navigation:** Expo Router (File-based routing)
- **Database:** `expo-sqlite` (Local device storage for history, library, and caching)
- **UI/Styling:** React Native StyleSheet & `expo-image` (for performant disk-cached images)
- **Scraping Engine:** Custom Javascript parsers utilizing `cheerio` (Fast HTML parser) to extract novel data natively without WebViews.

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the Expo development server:**
   ```bash
   npx expo start
   ```

3. **Run on your device:**
   - Download the **Expo Go** app on your iOS or Android device.
   - Scan the QR code shown in the terminal.

## 📂 Project Structure

```text
mobile-light-novel/
├── app/
│   ├── (tabs)/              # Main bottom navigation tabs (Library, Updates, History, Browse, More)
│   ├── novel/               # Novel-specific screens (Details, Chapter Reader)
│   └── source/              # Extension source browsing (Latest/Popular novels)
├── components/              # Reusable UI components
├── services/
│   ├── database/            # SQLite Database handlers (History, Library, Cache)
│   ├── extensions/          # Extension Manager (Handles loading scrapers)
│   └── parsers/             # The actual scraping logic (e.g., NovelFireExtension)
└── assets/                  # Static assets (Images, Fonts)
```

## 📝 Planned Improvements
- Add more scraper extensions (BoxNovel, ReadLightNovel, etc.)
- Customizable reader settings (Font size, background color, line spacing)
- Automatic tracking integration (MyAnimeList / AniList)
- Chapter update background tasks

## 📜 License
This project is for educational and personal use.
