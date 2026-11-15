import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInitialSeedData } from './seedData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'runtime-db.json');

let state = null;

function loadState() {
  if (state) return state;
  try {
    if (fs.existsSync(DB_FILE) && process.env.NODE_ENV !== 'test') {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      state = JSON.parse(raw);
      return state;
    }
  } catch {
    // Fall back to fresh seed data if disk read fails
  }
  state = createInitialSeedData();
  persistState();
  return state;
}

export function persistState() {
  if (!state || process.env.NODE_ENV === 'test') return;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Read-only filesystem in serverless/container environments is gracefully handled in-memory
  }
}

export function getStore() {
  return loadState();
}

export function resetStoreToSeed() {
  state = createInitialSeedData();
  persistState();
  return state;
}

export function addActivity(actor, role, action) {
  const store = getStore();
  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const entry = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: timeStr,
    actor,
    role,
    action,
  };
  store.activityFeed.unshift(entry);
  if (store.activityFeed.length > 40) {
    store.activityFeed.length = 40;
  }
  persistState();
  return entry;
}
