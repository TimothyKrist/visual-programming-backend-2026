import { Prisma } from '@prisma/client';
import { ErrorRequestHandler } from 'express';
import { ErrorResponse } from '../models/error.response';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    res.status(404).json({ error: 'Todo not found' } satisfies ErrorResponse);
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'Invalid JSON body' } satisfies ErrorResponse);
    return;
  }
  if (error?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body is too large' } satisfies ErrorResponse);
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Internal server error' } satisfies ErrorResponse);
};
