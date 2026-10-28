import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { todoService as service } from '../services/todo.service';
import { emptyBody, todo, updateTodo } from '../validations/todo.validation';
import { ErrorResponse } from '../models/error.response';
import { toTodoResponse } from '../models/todo.response';

function idFrom(req: Request): string | null {
  const id = z.uuid().safeParse(req.params.id);
  return id.success ? id.data : null;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  const body = emptyBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: z.prettifyError(body.error) } satisfies ErrorResponse);
  try { res.json((await service.list(res.locals.userId)).map(toTodoResponse)); } catch (error) { next(error); }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  const body = emptyBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: z.prettifyError(body.error) } satisfies ErrorResponse);
  const id = idFrom(req);
  if (id === null) return res.status(400).json({ error: 'id must be a UUID' } satisfies ErrorResponse);
  try {
    const todo = await service.get(res.locals.userId, id);
    return todo ? res.json(toTodoResponse(todo)) : res.status(404).json({ error: 'Todo not found' } satisfies ErrorResponse);
  } catch (error) { return next(error); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  const input = todo.safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: z.prettifyError(input.error) } satisfies ErrorResponse);
  try { return res.status(201).json(toTodoResponse(await service.create(res.locals.userId, input.data))); }
  catch (error) { return next(error); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  const id = idFrom(req);
  if (id === null) return res.status(400).json({ error: 'id must be a UUID' } satisfies ErrorResponse);
  const input = updateTodo.safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: z.prettifyError(input.error) } satisfies ErrorResponse);
  try { return res.json(toTodoResponse(await service.update(res.locals.userId, id, input.data))); }
  catch (error) { return next(error); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  const body = emptyBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: z.prettifyError(body.error) } satisfies ErrorResponse);
  const id = idFrom(req);
  if (id === null) return res.status(400).json({ error: 'id must be a UUID' } satisfies ErrorResponse);
  try {
    await service.remove(res.locals.userId, id);
    return res.status(204).end();
  } catch (error) { return next(error); }
}
