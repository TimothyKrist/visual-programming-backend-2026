import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { authService } from '../services/auth.service';

function credentials(body: unknown): { email: string; password: string } | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { email, password } = body as Record<string, unknown>;
  if (Object.keys(body).some(key => !['email', 'password'].includes(key)) ||
      typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254 ||
      typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) return null;
  return { email: email.trim().toLowerCase(), password };
}

export async function register(req: Request, res: Response, next: NextFunction) {
  const input = credentials(req.body);
  if (!input) return res.status(400).json({ error: 'Provide a valid email and a password of at least 8 characters and at most 72 bytes' });
  try {
    const user = await authService.register(input.email, input.password);
    return res.status(201).json({ accessToken: authService.token(user.id) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Email is already registered' });
    }
    return next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  const input = credentials(req.body);
  if (!input) return res.status(400).json({ error: 'Provide a valid email and a password of at least 8 characters and at most 72 bytes' });
  try {
    const user = await authService.login(input.email, input.password);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    return res.json({ accessToken: authService.token(user.id) });
  } catch (error) { return next(error); }
}
