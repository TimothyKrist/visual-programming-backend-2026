import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app';

test('preflight permits the specified methods and Bearer headers before authentication', async function preflight() {
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'QUERY', 'HEAD']) {
    const response = await request(app)
      .options('/todos')
      .set('Origin', 'https://frontend.example')
      .set('Access-Control-Request-Method', method)
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    assert.equal(response.status, 204);
    assert.equal(response.headers['access-control-allow-origin'], '*');
    assert.equal(response.headers['access-control-allow-methods'], 'GET,POST,PUT,PATCH,DELETE,QUERY');
    assert.equal(response.headers['access-control-allow-headers'], 'authorization,content-type');
    assert.equal(response.headers['access-control-allow-credentials'], undefined);
  }
});

test('CORS headers accompany authentication, validation, and not-found responses', async function errorResponses() {
  process.env.JWT_SECRET = 'cors-test-secret';
  const responses = [
    await request(app).get('/todos').set('Origin', 'https://frontend.example'),
    await request(app).post('/auth/login').set('Origin', 'https://other.example').send({}),
    await request(app).get('/missing').set('Origin', 'https://frontend.example'),
  ];

  assert.deepEqual(responses.map(function status(response) {
    return response.status;
  }), [401, 400, 404]);
  for (const response of responses) {
    assert.equal(response.headers['access-control-allow-origin'], '*');
    assert.equal(response.headers['access-control-allow-credentials'], undefined);
  }
});
