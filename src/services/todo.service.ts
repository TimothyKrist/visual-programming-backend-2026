import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

export const todoService = {
  list: (userId: number) => prisma.todo.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
  get: (userId: number, id: number) => prisma.todo.findUnique({ where: { id, userId } }),
  create: (userId: number, data: Omit<Prisma.TodoUncheckedCreateInput, 'userId'>) => prisma.todo.create({ data: { ...data, userId } }),
  update: (userId: number, id: number, data: Prisma.TodoUpdateInput) => prisma.todo.update({ where: { id, userId }, data }),
  remove: (userId: number, id: number) => prisma.todo.delete({ where: { id, userId } }),
};
