import { Todo } from '@prisma/client';

export interface TodoResponse {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toTodoResponse(todo: Todo): TodoResponse {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    completed: todo.completed,
    userId: todo.userId,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  };
}
