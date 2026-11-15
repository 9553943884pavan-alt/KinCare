import { getStore } from '../data/store.js';
import { verifySessionToken, isDemoModeEnabled } from '../security/passcodeAuth.js';

/**
 * Strips sensitive passcode hash material from a Care Circle member record.
 */
export function sanitizeMemberPayload(member, { includeDemoHint = false } = {}) {
  if (!member) return null;
  const { passcodeHash: _hash, passcodePlainHint, ...rest } = member;
  if (includeDemoHint && isDemoModeEnabled() && passcodePlainHint) {
    return { ...rest, passcodePlainHint };
  }
  return rest;
}

/**
 * Attaches verified Bearer session user onto req.user and disables caching on /api routes.
 */
export function sessionReaderMiddleware(req, res, next) {
  if (req.path.startsWith('/api')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Vary', 'Authorization');
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    req.user = verifySessionToken(token);
  }
  next();
}

/**
 * Ensures the caller holds a valid, active Care Circle session token.
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required. Please sign in with your Care Circle passcode.',
    });
  }
  const store = getStore();
  const activeMember = store.careCircleMembers.find((m) => m.id === req.user.id);
  if (!activeMember) {
    return res.status(401).json({
      error: 'Session is no longer valid. Please sign in again.',
    });
  }
  req.user = {
    ...req.user,
    name: activeMember.name,
    role: activeMember.role,
    permissions: activeMember.permissions,
  };
  return next();
}

/**
 * Restricts an authenticated route to specific Care Circle roles.
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in with your Care Circle passcode.',
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: requires role (${allowedRoles.join(' or ')}). Signed in as ${req.user.role}.`,
      });
    }
    return next();
  };
}

/**
 * Wraps async route handlers so rejected promises forward cleanly to errorHandler.
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Global Express error handler returning structured JSON without leaking stack traces.
 */
export function errorHandler(err, _req, res, _next) {
  if ((err instanceof SyntaxError && err.status === 400) || err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON request body.' });
  }
  const status = Number.isInteger(err?.status) && err.status >= 400 ? err.status : 500;
  return res.status(status).json({
    error: err?.message || 'Internal server error',
  });
}
