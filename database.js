// JSON file-based database — no native deps needed
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'tracker_file.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (_) {
    return [];
  }
}

function write(rows) {
  fs.writeFileSync(DB_PATH, JSON.stringify(rows, null, 2));
}

module.exports = {
  getAll() {
    return read().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  },
  getOne(id) {
    return read().find(r => r.id === id) || null;
  },
  create(bookmark) {
    const rows = read();
    rows.push(bookmark);
    write(rows);
    return bookmark;
  },
  update(id, patch) {
    const rows = read();
    const idx = rows.findIndex(r => r.id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...patch };
    write(rows);
    return rows[idx];
  },
  remove(id) {
    const rows = read();
    const next = rows.filter(r => r.id !== id);
    if (next.length === rows.length) return false;
    write(next);
    return true;
  },
};
