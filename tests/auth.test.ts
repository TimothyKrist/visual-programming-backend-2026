import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import app from '../src/app';
import { todoService } from '../src/services/todo.service';
import { authService } from '../src/services/auth.service';

process.env.JWT_SECRET = 'test-secret';

test('registration and login validate credentials and issue one-hour access tokens', async t => {
  let saved: { id: number; email: string; passwordHash: string } | undefined;
  t.mock.method(authService, 'register', async (email, password) => {
    if (saved) throw new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' });
    assert.equal(password, 'password123');
    saved = { id: 1, email, passwordHash: 'hash' };
    return saved;
  });
  t.mock.method(authService, 'login', async (email, password) => email === saved?.email && password === 'password123' ? saved : null);

  const registered = await request(app).post('/auth/register').send({ email: ' Student@Example.com ', password: 'password123' });
  assert.equal(registered.status, 201);
  assert.equal(saved?.email, 'student@example.com');
  assert.deepEqual(Object.keys(registered.body), ['accessToken']);
  const payload = jwt.verify(registered.body.accessToken, 'test-secret') as jwt.JwtPayload;
  assert.equal(payload.sub, '1');
  assert.equal(payload.exp! - payload.iat!, 3600);
  assert.equal((await request(app).post('/auth/register').send({ email: 'student@example.com', password: 'password123' })).status, 409);
  assert.equal((await request(app).post('/auth/login').send({ email: 'student@example.com', password: 'wrongpass' })).status, 401);
  assert.equal((await request(app).post('/auth/login').send({ email: 'student@example.com', password: 'password123' })).status, 200);
  for (const body of [{}, { email: 'bad', password: 'password123' }, { email: 'x@example.com', password: 'short' }, { email: 'x@example.com', password: 'x'.repeat(73) }, { email: 'x@example.com', password: 'password123', admin: true }]) {
    assert.equal((await request(app).post('/auth/register').send(body)).status, 400);
  }
});

test('todo routes reject missing, tampered, expired and non-expiring tokens', async t => {
  const list = t.mock.method(todoService, 'list', async () => []);
  const expired = jwt.sign({}, 'test-secret', { subject: '1', expiresIn: -1 });
  const noExpiry = jwt.sign({}, 'test-secret', { subject: '1' });
  const wrongSecret = jwt.sign({}, 'wrong-secret', { subject: '1', expiresIn: '1h' });
  assert.equal((await request(app).get('/todos')).status, 401);
  for (const token of [expired, noExpiry, wrongSecret, 'invalid']) {
    assert.equal((await request(app).get('/todos').set('Authorization', `Bearer ${token}`)).status, 401);
  }
  assert.equal(list.mock.calls.length, 0);
});
