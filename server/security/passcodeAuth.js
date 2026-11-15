import crypto from 'node:crypto';

const SECRET = process.env.SESSION_SECRET || 'kincare-super-secure-hmac-secret-2026';
const PBKDF2_ITERATIONS = 10000;
const KEYLEN = 32;
const DIGEST = 'sha256';

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
  if (!passcode || !storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const candidateHash = crypto
    .pbkdf2Sync(String(passcode).trim(), salt, PBKDF2_ITERATIONS, KEYLEN, DIGEST)
    .toString('hex');

  const a = Buffer.from(originalHash, 'hex');
  const b = Buffer.from(candidateHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Signs a session token payload using HMAC-SHA256.
 * @param {object} payload
 * @returns {string}
 */
export function signSessionToken(payload) {
  const data = {
    ...payload,
    iat: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
  };
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
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
  const expectedSig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');

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
