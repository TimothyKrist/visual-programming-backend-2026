import { z } from 'zod';

export const todo = z.object({
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  completed: z.boolean().optional(),
}).strict();
export const updateTodo = todo.partial().refine(input => Object.keys(input).length > 0, 'At least one field is required');
export const emptyBody = z.object({}).strict().optional();
