import { NextFunction, Request, Response } from 'express';
import { todoService as service } from '../services/todo.service';

type TodoInput = { title?: string; description?: string | null; completed?: boolean };

function validateBody(body: unknown, create: boolean): TodoInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Body must be a JSON object');
  }
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some(key => !['title', 'description', 'completed'].includes(key))) {
    throw new Error('Only title, description, and completed are allowed');
  }
  if (create && !('title' in input)) throw new Error('title is required');
  if (!create && Object.keys(input).length === 0) throw new Error('At least one field is required');
  const data: TodoInput = {};
  if ('title' in input) {
    if (typeof input.title !== 'string' || !input.title.trim()) throw new Error('title must be a non-empty string');
    data.title = input.title.trim();
  }
  if ('description' in input) {
    if (input.description !== null && typeof input.description !== 'string') throw new Error('description must be a string or null');
    data.description = input.description as string | null;
  }
  if ('completed' in input) {
    if (typeof input.completed !== 'boolean') throw new Error('completed must be a boolean');
    data.completed = input.completed;
  }
  return data;
}

function idFrom(req: Request): number | null {
  if (!/^[1-9]\d*$/.test(req.params.id)) return null;
  const id = Number(req.params.id);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

export async function list(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.list(res.locals.userId)); } catch (error) { next(error); }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  const id = idFrom(req);
  if (id === null) return res.status(400).json({ error: 'id must be a positive integer' });
  try {
    const todo = await service.get(res.locals.userId, id);
    return todo ? res.json(todo) : res.status(404).json({ error: 'Todo not found' });
  } catch (error) { return next(error); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  let data: TodoInput;
  try { data = validateBody(req.body, true); }
  catch (error) { return res.status(400).json({ error: (error as Error).message }); }
  try { return res.status(201).json(await service.create(res.locals.userId, data as TodoInput & { title: string })); }
  catch (error) { return next(error); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  const id = idFrom(req);
  if (id === null) return res.status(400).json({ error: 'id must be a positive integer' });
  let data: TodoInput;
  try { data = validateBody(req.body, false); }
  catch (error) { return res.status(400).json({ error: (error as Error).message }); }
  try { return res.json(await service.update(res.locals.userId, id, data)); }
  catch (error) { return next(error); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  const id = idFrom(req);
  if (id === null) return res.status(400).json({ error: 'id must be a positive integer' });
  try {
    await service.remove(res.locals.userId, id);
    return res.status(204).end();
  } catch (error) { return next(error); }
}
