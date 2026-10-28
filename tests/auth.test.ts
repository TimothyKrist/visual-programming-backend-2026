import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import app from '../src/app';
import { todoService } from '../src/services/todo.service';
import { authService } from '../src/services/auth.service';

process.env.JWT_SECRET = 'test-secret';
const userId = '11111111-1111-4111-8111-111111111111';

test('registration and login validate credentials and issue one-hour access tokens', async t => {
  let saved: { id: string; email: string; passwordHash: string; createdAt: Date; updatedAt: Date } | undefined;
  t.mock.method(authService, 'register', async (email, password) => {
    if (saved) throw new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' });
    assert.equal(password, 'password123');
    saved = { id: userId, email, passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date() };
    return saved;
  });
  t.mock.method(authService, 'login', async (email, password) => email === saved?.email && password === 'password123' ? saved : null);

  const registered = await request(app).post('/auth/register').send({ email: ' Student@Example.com ', password: 'password123' });
  assert.equal(registered.status, 201);
  assert.equal(saved?.email, 'student@example.com');
  assert.deepEqual(Object.keys(registered.body), ['accessToken']);
  const payload = jwt.verify(registered.body.accessToken, 'test-secret') as jwt.JwtPayload;
  assert.equal(payload.sub, userId);
  assert.equal(payload.exp! - payload.iat!, 3600);
  assert.equal((await request(app).post('/auth/register').send({ email: 'student@example.com', password: 'password123' })).status, 409);
  assert.equal((await request(app).post('/auth/login').send({ email: 'student@example.com', password: 'wrongpass' })).status, 401);
  const loggedIn = await request(app).post('/auth/login').send({ email: 'student@example.com', password: 'password123' });
  assert.equal(loggedIn.status, 200);
  assert.deepEqual(Object.keys(loggedIn.body), ['accessToken']);
  for (const body of [{}, { email: 'bad', password: 'password123' }, { email: 'x@example.com', password: 'short' }, { email: 'x@example.com', password: '12345678' }, { email: 'x@example.com', password: 'password123', admin: true }]) {
    assert.equal((await request(app).post('/auth/register').send(body)).status, 400);
  }
  for (const body of [{}, { email: 'bad', password: 'password123' }, { email: 'x@example.com', password: '' }, { email: 'x@example.com', password: 'password123', extra: true }]) {
    assert.equal((await request(app).post('/auth/login').send(body)).status, 400);
  }
});

test('registration accepts passwords longer than eight characters without additional composition rules', async t => {
  const register = t.mock.method(authService, 'register', async (email, password) => ({ id: userId, email, passwordHash: password, createdAt: new Date(), updatedAt: new Date() }));
  for (const password of ['123456789', 'x'.repeat(73)]) {
    assert.equal((await request(app).post('/auth/register').send({ email: 'x@example.com', password })).status, 201);
  }
  assert.equal(register.mock.calls.length, 2);
});

test('todo routes reject missing, tampered, expired and non-expiring tokens', async t => {
  const list = t.mock.method(todoService, 'list', async () => []);
  const expired = jwt.sign({}, 'test-secret', { subject: userId, expiresIn: -1 });
  const noExpiry = jwt.sign({}, 'test-secret', { subject: userId });
  const invalidSubject = jwt.sign({}, 'test-secret', { subject: '1', expiresIn: '1h' });
  const wrongSecret = jwt.sign({}, 'wrong-secret', { subject: userId, expiresIn: '1h' });
  assert.equal((await request(app).get('/todos')).status, 401);
  for (const token of [expired, noExpiry, wrongSecret, invalidSubject, 'invalid']) {
    assert.equal((await request(app).get('/todos').set('Authorization', `Bearer ${token}`)).status, 401);
  }
  assert.equal(list.mock.calls.length, 0);
});
