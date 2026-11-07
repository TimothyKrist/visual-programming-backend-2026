import cors from 'cors';
import express, { Request, Response } from 'express';
import { errorHandler } from './middleware/error-handler';
import todoRoutes from './routes/todo.routes';
import authRoutes from './routes/auth.routes';
import { authenticate } from './middleware/auth';
import { ErrorResponse } from './models/error.response';

const app = express();

app.use(cors({
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'QUERY'],
}));
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/todos', authenticate, todoRoutes);
app.use(function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' } satisfies ErrorResponse);
});

app.use(errorHandler);

export default app;
