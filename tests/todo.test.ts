import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import app from '../src/app';
import { todoService } from '../src/services/todo.service';
import { authService } from '../src/services/auth.service';

process.env.JWT_SECRET = 'test-secret';
const token = authService.token(1);
const authorization = `Bearer ${token}`;

test('todo endpoints validate input and perform CRUD', async t => {
  const todo = { id: 1, title: 'Buy milk', description: null, completed: false, userId: 1, createdAt: new Date(), updatedAt: new Date() };
  const findMany = t.mock.method(todoService, 'list', async () => [todo]);
  const findUnique = t.mock.method(todoService, 'get', async (_userId, id) => id === 1 ? todo : null);
  const create = t.mock.method(todoService, 'create', async (_userId, data) => ({ ...todo, ...data }) as typeof todo);
  const missing = () => { throw new Prisma.PrismaClientKnownRequestError('missing', { code: 'P2025', clientVersion: 'test' }); };
  const update = t.mock.method(todoService, 'update', async (_userId, id, data) => id === 1 ? { ...todo, ...data } as typeof todo : missing());
  const remove = t.mock.method(todoService, 'remove', async (_userId, id) => id === 1 ? todo : missing());

  assert.equal((await request(app).get('/todos').set('Authorization', authorization)).body.length, 1);
  assert.equal(findMany.mock.calls.length, 1);
  assert.equal((await request(app).get('/todos/1').set('Authorization', authorization)).body.title, 'Buy milk');
  assert.equal((await request(app).get('/todos/2').set('Authorization', authorization)).status, 404);
  assert.equal(findUnique.mock.calls.length, 2);
  const created = await request(app).post('/todos').set('Authorization', authorization).send({ title: '  Buy milk  ' });
  assert.equal(created.status, 201);
  assert.equal(created.body.title, 'Buy milk');
  assert.deepEqual(create.mock.calls[0].arguments[1], { title: 'Buy milk' });
  const changed = await request(app).patch('/todos/1').set('Authorization', authorization).send({ completed: true, description: null });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.completed, true);
  assert.equal(update.mock.calls.length, 1);
  assert.equal((await request(app).patch('/todos/2').set('Authorization', authorization).send({ completed: true })).status, 404);
  assert.equal((await request(app).delete('/todos/1').set('Authorization', authorization)).status, 204);
  assert.equal((await request(app).delete('/todos/2').set('Authorization', authorization)).status, 404);
  assert.equal(remove.mock.calls.length, 2);

  for (const body of [{}, { title: '  ' }, { title: 4 }, { title: 'ok', extra: 1 }, { title: 'ok', completed: 'true' }, { title: 'ok', description: 4 }, []]) {
    assert.equal((await request(app).post('/todos').set('Authorization', authorization).send(body)).status, 400);
  }
  assert.equal((await request(app).patch('/todos/1').set('Authorization', authorization).send({})).status, 400);
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
