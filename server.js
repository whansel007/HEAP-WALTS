const express = require('express');
const cors    = require('cors');
const { v4: uuidv4 } = require('uuid');
const db      = require('./db');

const app = express();
const PORT    = 3001;
const API_KEY = process.env.API_KEY || 'manga-tracker-dev-key';

app.use(cors());
app.use(express.json());

function auth(req, res, next) {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET all bookmarks
app.get('/api/bookmarks', auth, (_req, res) => {
  res.json(db.getAll());
});

// POST create bookmark
app.post('/api/bookmarks', auth, (req, res) => {
  const { url, title, chapter = 0, status = 'Later' } = req.body;
  if (!url || !title) {
    return res.status(400).json({ error: 'url and title are required' });
  }
  const bookmark = db.create({
    id: uuidv4(),
    url,
    title,
    chapter,
    status,
    savedAt: new Date().toISOString(),
  });
  res.status(201).json(bookmark);
});

// PUT update chapter/status
app.put('/api/bookmarks/:id', auth, (req, res) => {
  const { chapter, status } = req.body;
  const updated = db.update(req.params.id, { chapter, status });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

// DELETE bookmark
app.delete('/api/bookmarks/:id', auth, (req, res) => {
  const deleted = db.remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

app.listen(PORT, () =>
  console.log(`Manga Tracker API → http://localhost:${PORT}  (API key: ${API_KEY})`)
);
