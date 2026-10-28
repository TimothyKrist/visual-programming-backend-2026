import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/prisma';

process.env.JWT_SECRET = 'test-secret';

test('PostgreSQL enforces todo ownership through every endpoint', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const emails = [`${randomUUID()}@example.com`, `${randomUUID()}@example.com`];
  let id: string | undefined;
  try {
    const first = await request(app).post('/auth/register').send({ email: emails[0], password: 'password123' });
    const second = await request(app).post('/auth/register').send({ email: emails[1], password: 'password123' });
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    const owner = `Bearer ${first.body.accessToken}`;
    const other = `Bearer ${second.body.accessToken}`;
    const login = await request(app).post('/auth/login').send({ email: emails[0], password: 'password123' });
    assert.equal(login.status, 200);
    assert.equal((await request(app).post('/auth/login').send({ email: emails[0], password: 'wrongpass' })).status, 401);
    const user = await prisma.user.findUnique({ where: { email: emails[0] } });
    assert.ok(user?.passwordHash.startsWith('sha256:$2'));
    assert.notEqual(user?.passwordHash, 'password123');
    assert.match(user!.id, /^[0-9a-f-]{36}$/i);
    assert.ok(user!.createdAt instanceof Date);
    assert.ok(user!.updatedAt instanceof Date);
    await new Promise(resolve => setTimeout(resolve, 10));
    const updatedUser = await prisma.user.update({ where: { id: user!.id }, data: { email: emails[0] } });
    assert.equal(updatedUser.createdAt.getTime(), user!.createdAt.getTime());
    assert.ok(updatedUser.updatedAt > user!.updatedAt);
    const created = await request(app).post('/todos').set('Authorization', owner).send({ title: 'Database test' });
    assert.equal(created.status, 201);
    id = created.body.id;
    assert.match(id!, /^[0-9a-f-]{36}$/i);
    assert.equal(created.body.userId, user!.id);
    assert.equal(created.body.completed, false);
    assert.equal(created.body.description, null);
    assert.ok(created.body.createdAt);
    assert.ok(created.body.updatedAt);
    assert.equal((await request(app).get(`/todos/${id}`).set('Authorization', owner)).body.title, 'Database test');
    assert.ok((await request(app).get('/todos').set('Authorization', owner)).body.some((item: { id: string }) => item.id === id));
    assert.equal((await request(app).get('/todos').set('Authorization', other)).body.length, 0);
    assert.equal((await request(app).get(`/todos/${id}`).set('Authorization', other)).status, 404);
    assert.equal((await request(app).patch(`/todos/${id}`).set('Authorization', other).send({ completed: true })).status, 404);
    assert.equal((await request(app).delete(`/todos/${id}`).set('Authorization', other)).status, 404);
    await new Promise(resolve => setTimeout(resolve, 10));
    const updated = await request(app).patch(`/todos/${id}`).set('Authorization', owner).send({ completed: true });
    assert.equal(updated.body.completed, true);
    assert.equal(updated.body.createdAt, created.body.createdAt);
    assert.ok(new Date(updated.body.updatedAt) > new Date(created.body.updatedAt));
    assert.equal((await prisma.todo.findUnique({ where: { id } }))?.completed, true);
    assert.equal((await request(app).delete(`/todos/${id}`).set('Authorization', owner)).status, 204);
    assert.equal((await request(app).get(`/todos/${id}`).set('Authorization', owner)).status, 404);
  } finally {
    if (id !== undefined) await prisma.todo.deleteMany({ where: { id } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  }
});
