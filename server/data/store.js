import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createInitialSeedData } from './seedData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEGACY_JSON_FILE = path.join(__dirname, 'runtime-db.json');

let state = null;
let sqliteDb = null;
let customSqlitePath = null;
let pgPool = null;
let pgWriteQueue = Promise.resolve();
let dbEngine = 'sqlite';
let dbLocation = ':memory:';
let lastDbError = null;
let initialized = false;

const MIGRATION_SQL_SQLITE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS kincare_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    elder_profile TEXT NOT NULL,
    care_circle_members TEXT NOT NULL,
    medications TEXT NOT NULL,
    routines TEXT NOT NULL,
    appointments TEXT NOT NULL,
    adherence_history TEXT NOT NULL,
    vitals_log TEXT NOT NULL,
    autonomy_decisions TEXT NOT NULL,
    email_logs TEXT NOT NULL,
    activity_feed TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

const MIGRATION_SQL_POSTGRES = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS kincare_state (
    id INTEGER PRIMARY KEY,
    elder_profile JSONB NOT NULL,
    care_circle_members JSONB NOT NULL,
    medications JSONB NOT NULL,
    routines JSONB NOT NULL,
    appointments JSONB NOT NULL,
    adherence_history JSONB NOT NULL,
    vitals_log JSONB NOT NULL,
    autonomy_decisions JSONB NOT NULL,
    email_logs JSONB NOT NULL,
    activity_feed JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

function resolveSqlitePath() {
  if (customSqlitePath) return customSqlitePath;
  if (process.env.SQLITE_DB_PATH) return process.env.SQLITE_DB_PATH;
  if (process.env.NODE_ENV === 'test') return ':memory:';
  return path.join(__dirname, 'kincare.sqlite');
}

function hydrateStateFromRow(row) {
  const seed = createInitialSeedData();
  const parseCol = (val, fallback) => {
    if (val === undefined || val === null) return fallback;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return fallback;
      }
    }
    return val;
  };
  return {
    elderProfile: parseCol(row.elder_profile, seed.elderProfile),
    careCircleMembers: parseCol(row.care_circle_members, seed.careCircleMembers),
    medications: parseCol(row.medications, seed.medications),
    routines: parseCol(row.routines, seed.routines),
    appointments: parseCol(row.appointments, seed.appointments),
    adherenceHistory: parseCol(row.adherence_history, seed.adherenceHistory),
    vitalsLog: parseCol(row.vitals_log, seed.vitalsLog),
    autonomyDecisions: parseCol(row.autonomy_decisions, seed.autonomyDecisions),
    emailLogs: parseCol(row.email_logs, seed.emailLogs),
    activityFeed: parseCol(row.activity_feed, seed.activityFeed),
  };
}

function readLegacyJsonIfPresent() {
  if (process.env.NODE_ENV === 'test' && !customSqlitePath) return null;
  try {
    if (fs.existsSync(LEGACY_JSON_FILE)) {
      const raw = fs.readFileSync(LEGACY_JSON_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.elderProfile && Array.isArray(parsed.medications)) {
        return parsed;
      }
    }
  } catch {
    // Ignore malformed legacy file
  }
  return null;
}

function removeLegacyJsonFile() {
  try {
    if (fs.existsSync(LEGACY_JSON_FILE)) {
      fs.unlinkSync(LEGACY_JSON_FILE);
    }
  } catch {
    // Ignore cleanup errors on read-only containers
  }
}

function ensureSqliteOpen() {
  if (sqliteDb) return sqliteDb;
  const targetPath = resolveSqlitePath();
  if (targetPath !== ':memory:') {
    try {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    } catch {
      // Directory might be read-only; handle below if open fails
    }
  }

  try {
    sqliteDb = new DatabaseSync(targetPath);
    if (targetPath !== ':memory:') {
      sqliteDb.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;');
    }
    dbLocation = targetPath;
    dbEngine = 'sqlite';
    lastDbError = null;
  } catch (err) {
    lastDbError = err?.message || 'SQLite file open failed; using in-memory SQLite';
    sqliteDb = new DatabaseSync(':memory:');
    dbLocation = ':memory:';
    dbEngine = 'sqlite';
  }

  sqliteDb.exec(MIGRATION_SQL_SQLITE);
  sqliteDb
    .prepare('INSERT OR IGNORE INTO schema_migrations (id, name, applied_at) VALUES (1, ?, ?)')
    .run('initial_kincare_schema', new Date().toISOString());

  return sqliteDb;
}

function writeSqliteState(nextState) {
  const db = ensureSqliteOpen();
  db.prepare(
    `INSERT INTO kincare_state (
      id, elder_profile, care_circle_members, medications, routines,
      appointments, adherence_history, vitals_log, autonomy_decisions,
      email_logs, activity_feed, updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      elder_profile = excluded.elder_profile,
      care_circle_members = excluded.care_circle_members,
      medications = excluded.medications,
      routines = excluded.routines,
      appointments = excluded.appointments,
      adherence_history = excluded.adherence_history,
      vitals_log = excluded.vitals_log,
      autonomy_decisions = excluded.autonomy_decisions,
      email_logs = excluded.email_logs,
      activity_feed = excluded.activity_feed,
      updated_at = excluded.updated_at`
  ).run(
    JSON.stringify(nextState.elderProfile),
    JSON.stringify(nextState.careCircleMembers),
    JSON.stringify(nextState.medications),
    JSON.stringify(nextState.routines),
    JSON.stringify(nextState.appointments),
    JSON.stringify(nextState.adherenceHistory),
    JSON.stringify(nextState.vitalsLog),
    JSON.stringify(nextState.autonomyDecisions),
    JSON.stringify(nextState.emailLogs),
    JSON.stringify(nextState.activityFeed),
    new Date().toISOString()
  );
}

async function writePostgresState(nextState) {
  if (!pgPool) return;
  const sql = `
    INSERT INTO kincare_state (
      id, elder_profile, care_circle_members, medications, routines,
      appointments, adherence_history, vitals_log, autonomy_decisions,
      email_logs, activity_feed, updated_at
    ) VALUES (1, $1::jsonb, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET
      elder_profile = EXCLUDED.elder_profile,
      care_circle_members = EXCLUDED.care_circle_members,
      medications = EXCLUDED.medications,
      routines = EXCLUDED.routines,
      appointments = EXCLUDED.appointments,
      adherence_history = EXCLUDED.adherence_history,
      vitals_log = EXCLUDED.vitals_log,
      autonomy_decisions = EXCLUDED.autonomy_decisions,
      email_logs = EXCLUDED.email_logs,
      activity_feed = EXCLUDED.activity_feed,
      updated_at = NOW()
  `;
  const params = [
    JSON.stringify(nextState.elderProfile),
    JSON.stringify(nextState.careCircleMembers),
    JSON.stringify(nextState.medications),
    JSON.stringify(nextState.routines),
    JSON.stringify(nextState.appointments),
    JSON.stringify(nextState.adherenceHistory),
    JSON.stringify(nextState.vitalsLog),
    JSON.stringify(nextState.autonomyDecisions),
    JSON.stringify(nextState.emailLogs),
    JSON.stringify(nextState.activityFeed),
  ];
  await pgPool.query(sql, params);
}

function loadStateSync() {
  if (state) return state;
  const db = ensureSqliteOpen();
  try {
    const existing = db.prepare('SELECT * FROM kincare_state WHERE id = 1').get();
    if (existing) {
      state = hydrateStateFromRow(existing);
      initialized = true;
      return state;
    }
  } catch (err) {
    lastDbError = err?.message || 'Failed reading SQLite state';
  }

  const migrated = readLegacyJsonIfPresent();
  state = migrated ? hydrateStateFromRow(migrated) : createInitialSeedData();
  if (migrated) {
    // Hydrate direct JS properties when migrating from runtime-db.json
    state = { ...createInitialSeedData(), ...migrated };
    removeLegacyJsonFile();
  }
  persistState();
  initialized = true;
  return state;
}

/**
 * Initializes PostgreSQL (when DATABASE_URL & `pg` are available) or persistent SQLite WAL storage.
 */
export async function initDatabase() {
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (databaseUrl && process.env.NODE_ENV !== 'test') {
    try {
      const pgMod = await import('pg');
      const { Pool } = pgMod.default || pgMod;
      const isLocal = /localhost|127\.0\.0\.1/.test(databaseUrl);
      pgPool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.DATABASE_SSL === 'false' || isLocal ? false : { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 30000,
      });
      await pgPool.query(MIGRATION_SQL_POSTGRES);
      await pgPool.query(
        'INSERT INTO schema_migrations (id, name) VALUES (1, $1) ON CONFLICT (id) DO NOTHING',
        ['initial_kincare_schema']
      );

      const { rows } = await pgPool.query('SELECT * FROM kincare_state WHERE id = 1');
      if (rows.length > 0) {
        state = hydrateStateFromRow(rows[0]);
      } else {
        const legacy = readLegacyJsonIfPresent();
        state = legacy ? { ...createInitialSeedData(), ...legacy } : createInitialSeedData();
        await writePostgresState(state);
        if (legacy) removeLegacyJsonFile();
      }
      dbEngine = 'postgresql';
      dbLocation = 'DATABASE_URL (PostgreSQL)';
      lastDbError = null;
      initialized = true;
      return getDatabaseStatus();
    } catch (err) {
      lastDbError = `PostgreSQL init unavailable (${err?.message || 'error'}); falling back to SQLite`;
      if (pgPool) {
        await pgPool.end().catch(() => {});
        pgPool = null;
      }
    }
  }

  loadStateSync();
  return getDatabaseStatus();
}

export function persistState() {
  if (!state) return;
  if (dbEngine === 'postgresql' && pgPool) {
    const snapshot = structuredClone(state);
    pgWriteQueue = pgWriteQueue
      .then(() => writePostgresState(snapshot))
      .catch((err) => {
        lastDbError = err?.message || 'PostgreSQL write error';
      });
    return;
  }

  try {
    writeSqliteState(state);
    lastDbError = null;
  } catch (err) {
    lastDbError = err?.message || 'SQLite persist error';
  }
}

export function getStore() {
  return loadStateSync();
}

export function resetStoreToSeed() {
  state = createInitialSeedData();
  persistState();
  return state;
}

/**
 * Re-opens the SQLite store (used by automated persistence tests to simulate process restart).
 */
export function reopenDatabaseForTest(dbPath = null) {
  if (sqliteDb) {
    try {
      sqliteDb.close();
    } catch {
      // Ignore close errors
    }
    sqliteDb = null;
  }
  state = null;
  customSqlitePath = dbPath;
  return loadStateSync();
}

export function getDatabaseStatus() {
  return {
    engine: dbEngine,
    persistent: dbLocation !== ':memory:',
    location: dbEngine === 'postgresql' ? 'PostgreSQL (DATABASE_URL)' : path.basename(dbLocation),
    initialized,
    lastError: lastDbError,
  };
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
