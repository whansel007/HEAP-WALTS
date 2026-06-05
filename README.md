Manga Bookmark 

What full-stack means for this project

Your stack can be:

**Frontend:**

* Chrome extension popup \+ options page (HTML/CSS/JavaScript)  
* React/TypeScript or plain JS

**Backend:**

* Node.js \+ Express API server (you already use Express)  
* Optional: MongoDB or SQLite to store bookmarks for signed-in users

**Storage:**

* Local-only version: `chrome.storage.local` for bookmarks, no backend needed  
* Full-stack version: backend API \+ database \+ optional auth

You can start with local-only and then add a backend as an “advanced version.”

Core features (MVP)

For 8 sessions, focus on this minimal set:

1. **Save manga page**  
   * The user is on a manga chapter page.  
   * Click extension icon → “Save this page”.  
   * Extension stores:  
     * URL  
     * Title (from page `<title>` or manually entered)  
     * Chapter number (optional)  
     * Timestamp  
     * Status: Reading / Waiting / Later / Finished  
2. **View reading list**  
   * A popup or dedicated page shows all saved manga.  
   * Each entry shows: title, chapter, status, last read date.  
   * Click entry → open the page  
3. **Edit / delete**  
   * Edit chapter number.  
   * Change status (Reading → Finished).  
   * Delete entry  
4. **Search / filter**  
   * Filter by status (Reading, Later, Finished).  
   * Basic search by title

That’s already a complete, usable product.

Optional advanced features (if time)

* Export/backup to JSON, import from JSON  
* Drag-to-reorder list.  
* Notes per manga (“Started at chapter 5, dark arc”).  
* Simple sync with backend: login \+ cloud storage.  
* Dark mode / theme colors.

Suggested 8-week plan (1 session/week)

Each week is a milestone with a small demo.

**Week 1: Project setup \+ basic extension**

* Create extension folder: `manifest.json`, `popup.html`, `popup.js`, `background.js` or `content.js`.  
* Implement a “Save this page” button that stores URL \+ title in `chrome.storage.local`.  
* Show a simple list in the popup (just URLs for now).

**Week 2: Reading list UI**

* Improve popup UI: show title, chapter, status.  
* Add edit chapter number and change status.  
* Add delete button.  
* Store data as an array of entries in `chrome.storage.local`

**Week 3: Filter \+ search**

* Add filter buttons: All / Reading / Later / Finished.  
* Add search bar to filter by title.  
* Improve UI with CSS (maybe minimal Tailwind or custom styles).

**Week 5: Add backend (Express API)**

* Set up Node.js \+ Express server locally.  
* Create endpoints:  
  * `POST /api/bookmarks`  
  * `GET /api/bookmarks`  
  * `PUT /api/bookmarks/:id`  
  * `DELETE /api/bookmarks/:id`.\[[stackoverflow](https://stackoverflow.com/questions/12575965/is-it-possible-to-develop-google-chrome-extensions-using-node-js)\]  
* Extension can optionally send data to backend instead of, or in addition to, local storage.

**Week 6: Database \+ optional auth**

* Add MongoDB or SQLite.  
* Store bookmarks with user ID.  
* Optional: simple JWT auth or just API key for demo.  
* Extension can store API token in `chrome.storage.local`.

**Week 7: Polish UI \+ UX**

* Improve popup design, animations, error states.  
* Add loading states, empty state (“No bookmarks yet”).  
* Add a simple onboarding tutorial.

**Week 8: Testing \+ demo \+ documentation**

* Test on multiple manga sites.  
* Write a README with installation steps.  
* Record a 2–3 minute demo video.  
* Prepare a short slide deck for the program.

What makes this a strong full-stack demo

You can show:

* A working Chrome extension (frontend).  
* A Node.js \+ Express backend (API).  
* A database (optional but looks good).  
* Clear data flow: extension → backend → database.  
* Your own UI design, not just a template.