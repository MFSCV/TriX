import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../src/server.mjs';

const TOKEN = 'owner-token-for-http-test-at-least-32-characters';
function fixture() {
  const calls = [];
  const service = {
    doctor: () => ({ profile: 'local-owner', model_configured: false }),
    projectList: () => [], projectInspect: id => ({ id }),
    projectBind: value => { calls.push(['bind', value]); return value; },
    configValidate: value => ({ valid: true, input: value }), configGenerate: value => value,
    planCreate: value => ({ ...value, id: 'plan-one' }),
    planFromPrompt: () => { throw Object.assign(new Error('No model is configured.'), { code: 'MODEL_NOT_CONFIGURED' }); },
    taskSubmit: value => { calls.push(['submit', value]); return { id: 'task-one', lifecycle: 'QUEUED' }; },
    taskGet: id => ({ id, lifecycle: 'SUCCEEDED' }), taskList: () => [],
    taskCancel: id => ({ id, lifecycle: 'CANCELLING' }), taskResume: id => ({ id, lifecycle: 'QUEUED' }),
    taskEvents: (id, options) => ({ id, options, events: [] }), artifactGet: id => ({ id, output: 'HELLO' }),
    evidenceGet: id => ({ id, verified: true }), changeApply: () => ({ id: 'apply-task', lifecycle: 'QUEUED' }),
    changeVerify: id => ({ id, delivery: 'verified' }), changeRecover: id => ({ id, delivery: 'recovered' }),
    taskWait: id => ({ id, lifecycle: 'SUCCEEDED' })
  };
  return { service, calls };
}
async function setup(t) {
  const f = fixture(), runtime = await startServer({ service: f.service, token: TOKEN });
  t.after(() => runtime.close());
  const request = (route, { method = 'GET', data, raw, auth = true, headers = {} } = {}) => fetch(runtime.url + route, {
    method, headers: { ...(auth ? { Authorization: `Bearer ${TOKEN}` } : {}), ...(data !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    ...(data !== undefined || raw !== undefined ? { body: raw ?? JSON.stringify(data) } : {})
  });
  return { ...f, runtime, request };
}

test('local API authenticates all project/task/artifact/evidence requests', async t => {
  const { request, calls } = await setup(t);
  for (const route of ['/api/v1/doctor', '/api/v1/projects', '/api/v1/tasks/task-one', '/api/v1/tasks/task-one/artifact', '/api/v1/tasks/task-one/evidence']) {
    const r = await request(route, { auth: false }); assert.equal(r.status, 401); assert.equal((await r.json()).error.code, 'AUTHENTICATION_REQUIRED');
  }
  assert.equal((await request('/api/v1/projects', { method: 'POST', auth: false, data: { id: 'forged', root: '/' } })).status, 401);
  assert.deepEqual(calls, []);
});

test('health and static UI reveal no token or private runtime task data', async t => {
  const { request } = await setup(t);
  const health = await request('/health', { auth: false }); assert.equal(health.status, 200); assert.deepEqual((await health.json()).data, { service: 'TriX', ready: true });
  const page = await request('/', { auth: false }); assert.equal(page.status, 200); assert.ok(!(await page.text()).includes(TOKEN));
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/); assert.equal(page.headers.get('cache-control'), 'no-store'); assert.equal(page.headers.get('access-control-allow-origin'), null);
  assert.equal((await request('/runtime-client.mjs', { auth: false })).status, 200);
});

test('cross-origin and rebinding-host requests are denied before operations', async t => {
  const { runtime, calls } = await setup(t);
  for (const headers of [{ Origin: 'https://attacker.invalid' }, { Host: 'evil.example:1234' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    const status = await new Promise((resolve, reject) => {
      const req = http.request(runtime.url + '/api/v1/projects', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...headers } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
      req.on('error', reject); req.end(JSON.stringify({ id: 'forged', root: '/' }));
    });
    assert.equal(status, 403, JSON.stringify(headers));
  }
  assert.deepEqual(calls, []);
});

test('mutations require bounded JSON objects and reject duplicate keys', async t => {
  const { request, calls } = await setup(t);
  for (const raw of ['[]', 'null', '{', '{"id":"first","id":"second","root":"/tmp"}', '{"id":"a","root":"/tmp","nested":{"a":1,"a":2}}']) assert.equal((await request('/api/v1/projects', { method: 'POST', raw })).status, 400, raw);
  assert.equal((await request('/api/v1/projects', { method: 'POST', raw: JSON.stringify({ id: 'a', root: 'x'.repeat(1024 * 1024) }) })).status, 413);
  assert.equal((await request('/api/v1/projects', { method: 'POST', raw: '{}', headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.deepEqual(calls, []);
});

test('submission means accepted and filters caller-supplied authority', async t => {
  const { request, calls } = await setup(t);
  const r = await request('/api/v1/tasks', { method: 'POST', data: { projectId: 'p', plan: { id: 'plan-one' }, apply: false, idempotencyKey: 'k', actor_id: 'administrator', grants: ['*'] } });
  assert.equal(r.status, 202); const envelope = await r.json(); assert.equal(envelope.status, 'accepted'); assert.equal(envelope.data.lifecycle, 'QUEUED');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), { projectId: 'p', plan: { id: 'plan-one' }, apply: false, idempotencyKey: 'k' });
});

test('RPC exposes only own allowlisted operations and filters project authority', async t => {
  const { request, calls } = await setup(t);
  for (const method of ['constructor', '__proto__', 'close', 'toString', 'deleteEverything']) assert.equal((await request('/api/v1/rpc', { method: 'POST', data: { method, params: [] } })).status, 400, method);
  const bound = await request('/api/v1/rpc', { method: 'POST', data: { method: 'projectBind', params: [{ id: 'p', root: '/tmp/p', grants: ['*'] }] } }); assert.equal(bound.status, 200); assert.deepEqual(calls, [['bind', { id: 'p', root: '/tmp/p' }]]);
  const doctor = await request('/api/v1/rpc', { method: 'POST', data: { method: 'doctor', params: [] } }); assert.equal((await doctor.json()).data.profile, 'local-owner');
});

test('observation validates cursors and static routes cannot expose arbitrary files', async t => {
  const { request } = await setup(t);
  assert.equal((await (await request('/api/v1/tasks/task-one/events?after=2')).json()).data.options.after, 2);
  for (const cursor of ['-1', 'NaN', '9007199254740992']) assert.equal((await request(`/api/v1/tasks/task-one/events?after=${cursor}`)).status, 400);
  for (const route of ['/package.json', '/%2e%2e/package.json', '/src/service.mjs', '/.git/config']) { const r = await request(route); assert.equal(r.status, 404); assert.ok(!(await r.text()).includes('[core]')); }
});

test('missing model is explicit instead of a fabricated proposal', async t => {
  const { request } = await setup(t); const r = await request('/api/v1/chat', { method: 'POST', data: { projectId: 'p', prompt: 'uppercase', input: 'hello' } }); assert.equal(r.status, 503); assert.equal((await r.json()).error.code, 'MODEL_NOT_CONFIGURED');
});

test('unexpected internal exceptions never echo seeded secret values', async t => {
  const f = fixture(); f.service.doctor = () => { throw new Error('seeded-secret-canary'); };
  const runtime = await startServer({ service: f.service, token: TOKEN }); t.after(() => runtime.close());
  const r = await fetch(runtime.url + '/api/v1/doctor', { headers: { Authorization: `Bearer ${TOKEN}` } }); assert.equal(r.status, 500); assert.ok(!(await r.text()).includes('seeded-secret-canary'));
});

test('real HTTP flow binds, plans, computes, applies a linked task and verifies installed files', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'trix-http-integration-')), project = path.join(temp, 'project');
  await mkdir(project); await writeFile(path.join(project, 'README.md'), 'A disposable HTTP integration fixture.');
  const runtime = await startServer({ stateDir: path.join(temp, 'state'), workspaceRoot: project, model: null, token: TOKEN });
  t.after(async () => { await runtime.close(); await rm(temp, { recursive: true, force: true }); });
  const request = async (route, data) => {
    const response = await fetch(runtime.url + '/api/v1' + route, { method: data === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${TOKEN}`, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    return { response, body: await response.json() };
  };
  assert.equal((await request('/projects', { id: 'outside', root: os.tmpdir() })).response.status, 403);
  assert.equal((await request('/projects', { id: 'fixture', root: project })).response.status, 201);
  const unavailable = await request('/chat', { projectId: 'fixture', prompt: 'Make uppercase', input: 'hello' }); assert.equal(unavailable.response.status, 503); assert.equal(unavailable.body.error.code, 'MODEL_NOT_CONFIGURED');
  assert.equal((await request('/plans', { projectId: 'fixture', input: 'hello', operation: 'text.normalize', options: {}, target: 'gpu' })).response.status, 409);
  const planned = await request('/plans', { projectId: 'fixture', input: '  Hello TriX\r\n', operation: 'text.normalize', options: { trim: true, case: 'upper', newline: 'lf' } }); assert.equal(planned.response.status, 200);
  const submitted = await request('/tasks', { projectId: 'fixture', plan: planned.body.data, apply: false, idempotencyKey: 'http-fixture' }); assert.equal(submitted.response.status, 202); assert.equal(submitted.body.status, 'accepted');
  const taskId = submitted.body.data.id, complete = await request('/rpc', { method: 'taskWait', params: [taskId] });
  assert.equal(complete.body.data.lifecycle, 'SUCCEEDED'); assert.equal(complete.body.data.completion_mode, 'BUNDLE_READY'); assert.equal(complete.body.data.result.output, 'HELLO TRIX');
  const applied = await request(`/tasks/${taskId}/apply`, {}); assert.equal(applied.response.status, 202); const appliedId = applied.body.data.id; assert.notEqual(appliedId, taskId);
  await request('/rpc', { method: 'taskWait', params: [appliedId] });
  assert.equal((await request(`/tasks/${appliedId}`)).body.data.completion_mode, 'LOCAL_VERIFIED');
  assert.ok((await readFile(path.join(project, 'trix.integration.mjs'), 'utf8')).length > 0); assert.ok((await readFile(path.join(project, 'trix.integration.json'), 'utf8')).length > 0);
  const evidence = await request(`/tasks/${appliedId}/evidence`); assert.equal(evidence.body.data.lifecycle, 'SUCCEEDED'); assert.equal(evidence.body.data.completion_mode, 'LOCAL_VERIFIED');
  assert.equal((await request(`/tasks/${taskId}`)).body.data.completion_mode, 'BUNDLE_READY');
});
