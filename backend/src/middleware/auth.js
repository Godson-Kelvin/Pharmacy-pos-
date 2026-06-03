import { verifyToken } from '../lib/auth.js';

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, cookieString) => {
    const [name, value] = cookieString.split('=').map((part) => part.trim());
    if (!name || !value) return cookies;
    cookies[name] = decodeURIComponent(value);
    return cookies;
  }, {});
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const cookies = parseCookies(req.headers.cookie);
  const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
