import { prisma } from '../prisma';
import type { z } from 'zod';
import type { todo, updateTodo } from '../validations/todo.validation';

export const todoService = {
  list(userId: string) {
    return prisma.todo.findMany({ where: { userId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  },
  get(userId: string, id: string) {
    return prisma.todo.findUnique({ where: { id, userId } });
  },
  create(userId: string, data: z.infer<typeof todo>) {
    return prisma.todo.create({ data: { ...data, userId } });
  },
  update(userId: string, id: string, data: z.infer<typeof updateTodo>) {
    return prisma.todo.update({ where: { id, userId }, data });
  },
  remove(userId: string, id: string) {
    return prisma.todo.delete({ where: { id, userId } });
  },
};
