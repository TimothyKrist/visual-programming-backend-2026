import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma';
import { authService } from '../src/services/auth.service';

test('password hashing verifies all bytes and upgrades legacy hashes', async () => {
  let user = { id: '11111111-1111-4111-8111-111111111111', email: 'test@example.com', passwordHash: '' };
  prisma.user.create = (async ({ data }: any) => {
    user = { ...user, ...data };
    return user;
  }) as typeof prisma.user.create;
  prisma.user.findUnique = (async () => user) as typeof prisma.user.findUnique;
  prisma.user.updateMany = (async ({ data }: any) => {
    user = { ...user, ...data };
    return { count: 1 };
  }) as typeof prisma.user.updateMany;

  for (const password of ['x'.repeat(72) + 'original', '🔑'.repeat(100), 'a'.repeat(10000)]) {
    await authService.register(user.email, password);
    assert.ok(user.passwordHash.startsWith('sha256:$2'));
    assert.ok(await authService.login(user.email, password));
    assert.equal(await authService.login(user.email, password + 'different'), null);
  }

  user.passwordHash = await bcrypt.hash('oldpassword', 10);
  assert.equal(await authService.login(user.email, 'wrongpassword'), null);
  assert.ok(await authService.login(user.email, 'oldpassword'));
  assert.ok(user.passwordHash.startsWith('sha256:$2'));
  assert.ok(await authService.login(user.email, 'oldpassword'));

  user.passwordHash = await bcrypt.hash('x'.repeat(72), 10);
  assert.equal(await authService.login(user.email, 'x'.repeat(72) + 'other'), null);
  assert.ok(user.passwordHash.startsWith('$2'));
});
