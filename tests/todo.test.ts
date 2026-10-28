import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import app from '../src/app';
import { todoService } from '../src/services/todo.service';
import { authService } from '../src/services/auth.service';

process.env.JWT_SECRET = 'test-secret';
const userId = '11111111-1111-4111-8111-111111111111';
const todoId = '22222222-2222-4222-8222-222222222222';
const missingId = '33333333-3333-4333-8333-333333333333';
const token = authService.token(userId);
const authorization = `Bearer ${token}`;

test('todo endpoints validate input and perform CRUD', async t => {
  const todo = { id: todoId, title: 'Buy milk', description: null, completed: false, userId, createdAt: new Date(), updatedAt: new Date(), internal: 'not for clients' };
  const expected = { id: todo.id, title: todo.title, description: todo.description, completed: todo.completed, userId: todo.userId, createdAt: todo.createdAt.toISOString(), updatedAt: todo.updatedAt.toISOString() };
  const findMany = t.mock.method(todoService, 'list', async () => [todo]);
  const findUnique = t.mock.method(todoService, 'get', async (_userId, id) => id === todoId ? todo : null);
  const create = t.mock.method(todoService, 'create', async (_userId, data) => ({ ...todo, ...data }) as typeof todo);
  const missing = () => { throw new Prisma.PrismaClientKnownRequestError('missing', { code: 'P2025', clientVersion: 'test' }); };
  const update = t.mock.method(todoService, 'update', async (_userId, id, data) => id === todoId ? { ...todo, ...data } as typeof todo : missing());
  const remove = t.mock.method(todoService, 'remove', async (_userId, id) => id === todoId ? todo : missing());

  assert.deepEqual((await request(app).get('/todos').set('Authorization', authorization)).body, [expected]);
  assert.equal(findMany.mock.calls.length, 1);
  assert.deepEqual((await request(app).get(`/todos/${todoId}`).set('Authorization', authorization)).body, expected);
  assert.equal((await request(app).get(`/todos/${missingId}`).set('Authorization', authorization)).status, 404);
  assert.equal(findUnique.mock.calls.length, 2);
  const created = await request(app).post('/todos').set('Authorization', authorization).send({ title: '  Buy milk  ' });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body, expected);
  assert.deepEqual(create.mock.calls[0].arguments[1], { title: 'Buy milk' });
  const changed = await request(app).patch(`/todos/${todoId}`).set('Authorization', authorization).send({ completed: true, description: null });
  assert.equal(changed.status, 200);
  assert.deepEqual(changed.body, { ...expected, completed: true });
  assert.equal(update.mock.calls.length, 1);
  assert.equal((await request(app).patch(`/todos/${missingId}`).set('Authorization', authorization).send({ completed: true })).status, 404);
  assert.equal((await request(app).delete(`/todos/${todoId}`).set('Authorization', authorization)).status, 204);
  assert.equal((await request(app).delete(`/todos/${missingId}`).set('Authorization', authorization)).status, 404);
  assert.equal(remove.mock.calls.length, 2);

  for (const body of [{}, { title: '  ' }, { title: 4 }, { title: 'ok', extra: 1 }, { title: 'ok', completed: 'true' }, { title: 'ok', description: 4 }, []]) {
    assert.equal((await request(app).post('/todos').set('Authorization', authorization).send(body)).status, 400);
  }
  for (const body of [{}, { title: ' ' }, { completed: 'true' }, { extra: 1 }, []]) {
    assert.equal((await request(app).patch(`/todos/${todoId}`).set('Authorization', authorization).send(body)).status, 400);
  }
  for (const response of [
    await request(app).get('/todos').set('Authorization', authorization).send({ extra: 1 }),
    await request(app).get(`/todos/${todoId}`).set('Authorization', authorization).send({ extra: 1 }),
    await request(app).delete(`/todos/${todoId}`).set('Authorization', authorization).send({ extra: 1 }),
  ]) assert.equal(response.status, 400);
  for (const id of ['0', '-1', '1.5', '2147483648', 'abc']) {
    assert.equal((await request(app).get(`/todos/${id}`).set('Authorization', authorization)).status, 400);
  }
  assert.equal((await request(app).post('/todos').set('Authorization', authorization).set('Content-Type', 'application/json').send('{')).status, 400);
  assert.equal((await request(app).post('/todos').set('Authorization', authorization).send({ title: 'x'.repeat(110000) })).status, 413);
  assert.equal((await request(app).get('/missing')).status, 404);
});

test('unexpected service errors are handled without exposing details', async t => {
  const error = new Error('private database details');
  t.mock.method(todoService, 'list', async () => { throw error; });
  const log = t.mock.method(console, 'error', () => {});
  const response = await request(app).get('/todos').set('Authorization', authorization);
  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { error: 'Internal server error' });
  assert.equal(log.mock.calls[0].arguments[0], error);
});
