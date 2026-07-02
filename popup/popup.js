// popup.js — the entry point. This is the file popup.html loads first.
//
// This file's only job is to start the app. It doesn't contain any UI or
// business logic itself — everything happens inside ui.js's init() function.
// Keeping this file tiny means there's one obvious "front door" to the app,
// separate from how the app actually behaves.

import { init } from './ui.js';

init();