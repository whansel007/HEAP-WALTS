# Manga Tracker

**Manga Tracker** is a clean, lightweight Chrome extension designed to help you track your manga reading and anime watching progress. It runs locally in your browser, automatically detects chapters/episodes as you read/watch on various platforms, and keeps your library organized.

## Features

- **Manga & Anime Support:** Categorize and track both manga (chapter-based) and anime (episode-based) entries.
- **Smart Auto-Detection:** Automatically parses current reading progress from sites like MangaDex, MangaPlus, MangaFire, Webtoons, TCBScans, and applies customizable patterns on other sites.
- **Library Organization:** Filter your list by reading status (`Current`, `Later`, `Finished`), perform title searches, or filter by custom tags.
- **Dynamic Search Shortcuts:** Search for items directly on customizable search directories (e.g. MangaDex for manga or Miruro for anime).
- **Import & Export:** Back up your tracking list as a JSON file and restore it easily.
- **Japanese Dictionary & Translation:** Highlight any Japanese word on a page and click the **Translate** button to search definitions, readings, and part-of-speech details instantly via the Jisho.org API. You can also type/paste words manually to query the dictionary inside the popup.
- **Interactive Kana Reference Board:** Click the **Kana** button to toggle a handy cheat sheet of Hiragana and Katakana characters paired with romaji. Click individual characters to flip them between Hiragana and Katakana modes dynamically.
- **Optional Backend Sync:** Support for syncing bookmarks to a local backend database if configured.

---

## Installation Tutorial

To install and load **Manga Tracker** as an unpacked extension in Google Chrome:

### 1. Download the Extension Files
Ensure that you have cloned or downloaded this repository to a local folder on your computer.

### 2. Open the Extensions Page in Chrome
- Open Google Chrome.
- In the address bar, type `chrome://extensions/` and press **Enter**.
- Alternatively, click the **Extensions** icon (puzzle piece) in the top-right toolbar and select **Manage Extensions**.

### 3. Enable Developer Mode
- In the top-right corner of the Extensions page, toggle the **Developer mode** switch to **ON**.

### 4. Load the Extension
- Click the **Load unpacked** button in the top-left corner of the page.
- Select the project directory (the folder containing `manifest.json`, `popup.html`, `popup.css`, etc.) and click **Select Folder** (or **Open**).

### 5. Pin the Extension (Recommended)
- Click the **Extensions** icon (puzzle piece) in the Chrome toolbar.
- Find **Manga Tracker** in the list and click the **Pin** icon next to it to make it easily accessible in your toolbar.