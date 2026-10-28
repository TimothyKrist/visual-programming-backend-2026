import 'dotenv/config';
import app from './app';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

app.listen(port, () => console.log(`Listening on port ${port}`));
