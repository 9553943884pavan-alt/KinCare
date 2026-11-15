import crypto from 'node:crypto';

const PBKDF2_ITERATIONS = 10000;
const KEYLEN = 32;
const DIGEST = 'sha256';
const DEV_FALLBACK_SECRET = 'kincare-super-secure-hmac-secret-2026';
const WEAK_PLACEHOLDER_SECRETS = new Set([
  'kincare-super-secure-hmac-secret-2026',
  'changeme',
  'secret',
  'default-secret',
  'your-secret-here',
]);

let runtimeProductionSecret = null;

/**
 * Determines whether explicit demo shortcuts (one-tap PIN hints, universal demo PIN) are enabled.
 * Defaults to true outside production and false in production unless DEMO_MODE=true is set.
 */
export function isDemoModeEnabled(env = process.env) {
  const flag = String(env.DEMO_MODE || '').trim().toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  return env.NODE_ENV !== 'production';
}

/**
 * Validates that SESSION_SECRET is strong and non-default in production when DEMO_MODE is disabled.
 */
export function validateProductionSecret(env = process.env) {
  if (env.NODE_ENV === 'production' && !isDemoModeEnabled(env)) {
    const raw = String(env.SESSION_SECRET || '').trim();
    if (raw.length < 16 || WEAK_PLACEHOLDER_SECRETS.has(raw.toLowerCase())) {
      throw new Error(
        'Production security error: SESSION_SECRET must be at least 16 characters and not a default placeholder when DEMO_MODE is disabled.'
      );
    }
  }
  return true;
}

/**
 * Resolves the active HMAC secret for signing and verifying session tokens.
 */
export function getSessionSecret(env = process.env) {
  const raw = String(env.SESSION_SECRET || '').trim();
  const isWeak = raw.length < 16 || WEAK_PLACEHOLDER_SECRETS.has(raw.toLowerCase());

  if (env.NODE_ENV === 'production' && !isDemoModeEnabled(env)) {
    if (String(env.ENFORCE_SESSION_SECRET || '').trim().toLowerCase() === 'true') {
      validateProductionSecret(env);
    }
    if (!isWeak) return raw;
    if (!runtimeProductionSecret) {
      runtimeProductionSecret = crypto.randomBytes(32).toString('hex');
    }
    return runtimeProductionSecret;
  }

  return raw || DEV_FALLBACK_SECRET;
}

/**
 * Hashes a passcode with a deterministic or provided salt using PBKDF2-HMAC-SHA256.
 * @param {string} passcode
 * @param {string} [salt]
 * @returns {string} salt:hash
 */
export function hashPasscode(passcode, salt = crypto.randomBytes(16).toString('hex')) {
  const normalized = String(passcode).trim();
  const derivedKey = crypto
    .pbkdf2Sync(normalized, salt, PBKDF2_ITERATIONS, KEYLEN, DIGEST)
    .toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Verifies a plaintext passcode against a stored salt:hash using timingSafeEqual.
 * @param {string} passcode
 * @param {string} storedHash
 * @returns {boolean}
 */
export function verifyPasscode(passcode, storedHash) {
  if (!passcode || typeof storedHash !== 'string' || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  try {
    const candidateHash = crypto
      .pbkdf2Sync(String(passcode).trim(), salt, PBKDF2_ITERATIONS, KEYLEN, DIGEST)
      .toString('hex');

    const a = Buffer.from(originalHash, 'hex');
    const b = Buffer.from(candidateHash, 'hex');
    if (a.length === 0 || a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Signs a session token payload using HMAC-SHA256.
 * @param {object} payload
 * @returns {string}
 */
export function signSessionToken(payload) {
  const secret = getSessionSecret();
  const data = {
    ...payload,
    iat: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
  };
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

/**
 * Verifies a signed session token.
 * @param {string} token
 * @returns {object|null}
 */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const secret = getSessionSecret();
  const expectedSig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');

  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
