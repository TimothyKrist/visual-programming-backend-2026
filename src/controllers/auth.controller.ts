import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { credentials, registration } from '../validations/auth.validation';
import { AuthResponse } from '../models/auth.response';
import { ErrorResponse } from '../models/error.response';

export async function register(req: Request, res: Response, next: NextFunction) {
  const input = registration.safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: z.prettifyError(input.error) } satisfies ErrorResponse);
  const { email, password } = input.data;
  try {
    const user = await authService.register(email, password);
    return res.status(201).json({ accessToken: authService.token(user.id) } satisfies AuthResponse);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Email is already registered' } satisfies ErrorResponse);
    }
    return next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  const input = credentials.safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: z.prettifyError(input.error) } satisfies ErrorResponse);
  const { email, password } = input.data;
  try {
    const user = await authService.login(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' } satisfies ErrorResponse);
    return res.json({ accessToken: authService.token(user.id) } satisfies AuthResponse);
  } catch (error) { return next(error); }
}
