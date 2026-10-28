import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ErrorResponse } from '../models/error.response';

export const authenticate: RequestHandler = (req, res, next) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return next(new Error('JWT_SECRET is required'));
  const match = /^Bearer (\S+)$/i.exec(req.get('Authorization') ?? '');
  if (!match) return res.status(401).json({ error: 'Access token required' } satisfies ErrorResponse);
  try {
    const payload = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !z.uuid().safeParse(payload.sub).success || typeof payload.exp !== 'number') throw new Error('Invalid token');
    res.locals.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired access token' } satisfies ErrorResponse);
  }
};
