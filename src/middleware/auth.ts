import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate: RequestHandler = (req, res, next) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return next(new Error('JWT_SECRET is required'));
  const match = /^Bearer (\S+)$/i.exec(req.get('Authorization') ?? '');
  if (!match) return res.status(401).json({ error: 'Access token required' });
  try {
    const payload = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
    const id = typeof payload === 'object' && typeof payload.sub === 'string' && /^[1-9]\d*$/.test(payload.sub) ? Number(payload.sub) : 0;
    if (!Number.isSafeInteger(id) || id > 2147483647 || id === 0 || typeof payload === 'string' || typeof payload.exp !== 'number') throw new Error('Invalid token');
    res.locals.userId = id;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
};
