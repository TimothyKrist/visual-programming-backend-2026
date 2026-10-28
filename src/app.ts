import express from 'express';
import { errorHandler } from './middleware/error-handler';
import todoRoutes from './routes/todo.routes';
import authRoutes from './routes/auth.routes';
import { authenticate } from './middleware/auth';

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/todos', authenticate, todoRoutes);
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.use(errorHandler);

export default app;
