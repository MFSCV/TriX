import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { canonicalize, digest, createPlan, verifyPlan, parseDataJSON, TriXError, MAX_INPUT_BYTES } from '../src/core.mjs';
import { executePlan, buildIntegrationFiles } from '../src/executor.mjs';

const fixture = overrides => createPlan({ projectId: 'project-test', sourceRevision: 'source-revision-1', input: '  Olá\r\nworld  ', ...overrides });
const code = expected => error => error instanceof TriXError && error.code === expected;

test('canonical encoding sorts object keys recursively without changing array order', () => {
  assert.equal(canonicalize({ z: [{ b: 2, a: 1 }, 3], a: 0 }), '{"a":0,"z":[{"a":1,"b":2},3]}');
  assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));
  assert.notEqual(digest([1, 2]), digest([2, 1]));
});

test('canonical encoding rejects cycles, accessors, sparse arrays and non-JSON data', () => {
  const cyclic = {}; cyclic.self = cyclic;
  for (const value of [cyclic, NaN, Infinity, undefined, 1n, new Date(), [, 1]]) assert.throws(() => canonicalize(value));
  let accessed = false;
  const getter = Object.defineProperty({}, 'secret', { enumerable: true, get() { accessed = true; return 'x'; } });
  assert.throws(() => canonicalize(getter)); assert.equal(accessed, false);
  assert.throws(() => canonicalize(Object.defineProperty({}, 'hidden', { value: 'x' })));
});

test('plan defaults are explicit and identity is deterministic across serializable copies', () => {
  const plan = fixture();
  assert.deepEqual(plan.options, { trim: false, case: 'preserve', newline: 'lf' });
  assert.equal(fixture().id, plan.id);
  assert.deepEqual(verifyPlan(JSON.parse(JSON.stringify(plan))), { valid: true, diagnostics: [], digest: plan.id });
  const { id, ...contents } = plan; assert.equal(id, digest(contents));
});

test('material input, source revision and operation options change the plan identity', () => {
  const plan = fixture();
  for (const override of [{ input: 'different' }, { sourceRevision: 'r2' }, { options: { trim: true } }]) assert.notEqual(fixture(override).id, plan.id);
});

test('semantic verifier detects a tampered input and unknown top-level fields', () => {
  const plan = fixture();
  assert.equal(verifyPlan({ ...plan, input: 'altered' }).diagnostics[0].code, 'DIGEST_MISMATCH');
  assert.equal(verifyPlan({ ...plan, execute_shell: 'echo not allowed' }).diagnostics[0].code, 'UNKNOWN_FIELD');
});

test('cycles and missing dependencies are rejected independently of digest', () => {
  const plan = fixture();
  assert.equal(verifyPlan({ ...plan, nodes: [{ ...plan.nodes[0], depends_on: ['transform'] }] }).diagnostics[0].code, 'PLAN_CYCLE');
  assert.equal(verifyPlan({ ...plan, nodes: [{ ...plan.nodes[0], depends_on: ['absent'] }] }).diagnostics[0].code, 'MISSING_DEPENDENCY');
});

test('future schema, incompatible target and unregistered operation fail before execution', async () => {
  assert.equal(verifyPlan({ ...fixture(), schema_version: 'trix.plan/v99' }).diagnostics[0].code, 'UNSUPPORTED_SCHEMA');
  assert.throws(() => fixture({ target: 'cuda' }), code('INCOMPATIBLE_TARGET'));
  assert.throws(() => fixture({ operation: 'shell.exec' }), code('UNSUPPORTED_OPERATION'));
  await assert.rejects(executePlan({ ...fixture(), target: 'cuda' }), code('INCOMPATIBLE_TARGET'));
});

test('all required fields and normalized options are part of verifier contract', () => {
  const plan = fixture();
  for (const key of Object.keys(plan)) { const changed = structuredClone(plan); delete changed[key]; assert.equal(verifyPlan(changed).valid, false, key); }
  const changed = structuredClone(plan); delete changed.options.trim;
  const { id, ...rest } = changed; changed.id = digest(rest);
  assert.equal(verifyPlan(changed).diagnostics[0].code, 'INVALID_PLAN');
});

test('invalid option types, unknown options and malformed project identifiers are refused', () => {
  for (const options of [{ trim: 'true' }, { case: 'title' }, { newline: 'crlf' }, { command: 'whoami' }]) assert.throws(() => fixture({ options }));
  for (const projectId of ['', '../outside', 'a/b', 'a'.repeat(129)]) assert.throws(() => fixture({ projectId }));
  assert.throws(() => fixture({ sourceRevision: '' }));
});

test('input bounds count UTF-8 bytes and invalid Unicode is rejected', () => {
  assert.throws(() => fixture({ input: 'é'.repeat(MAX_INPUT_BYTES / 2 + 1) }), code('LIMIT_EXCEEDED'));
  assert.throws(() => fixture({ input: '\ud800' }), code('INVALID_ARGUMENT'));
  assert.equal(verifyPlan(fixture({ input: 'a'.repeat(MAX_INPUT_BYTES) })).valid, true);
});

test('strict JSON parser rejects duplicate escaped keys, trailing syntax and unsafe numbers', () => {
  for (const input of ['{"a":1,"a":2}', '{"a":1,"\\u0061":2}', '{"n":1e999}', '{"n":9007199254740993}', '{"n":9.007199254740993e15}', '{"a":1,}', '{"n":01}', '{"a":true} false']) assert.throws(() => fixture({ input, operation: 'json.transform' }), undefined, input);
  assert.equal(parseDataJSON('{"a":"\\\"","b":[true,false,null]}').a, '"');
});

test('JSON nesting and value budgets are enforced', () => {
  assert.throws(() => parseDataJSON('['.repeat(66) + '0' + ']'.repeat(66)), code('LIMIT_EXCEEDED'));
  assert.throws(() => parseDataJSON('[' + '0,'.repeat(100_000) + '0]'), code('LIMIT_EXCEEDED'));
});

test('JSON transform requires object input, valid unique picks and present keys', () => {
  for (const input of ['[]', 'null', '1', '"x"']) assert.throws(() => fixture({ operation: 'json.transform', input }));
  for (const options of [{ pick: ['a', 'a'] }, { pick: ['absent'] }, { pick: [1] }, { sort_keys: 'true' }, { evaluate: 'x' }]) assert.throws(() => fixture({ operation: 'json.transform', input: '{"a":1}', options }));
});

test('controlled worker normalizes Unicode text and reports independently computed hashes', async () => {
  const plan = fixture({ options: { trim: true, case: 'upper' } }); const result = await executePlan(plan);
  assert.equal(result.output, 'OLÁ\nWORLD');
  assert.equal(result.evidence.output_sha256, createHash('sha256').update('OLÁ\nWORLD').digest('hex'));
  assert.equal(result.evidence.plan_digest, plan.id); assert.match(result.evidence.isolation, /not an OS security sandbox/);
});

test('controlled worker selects JSON properties and recursively sorts keys', async () => {
  const plan = fixture({ operation: 'json.transform', input: '{"z":5,"a":{"y":2,"x":1}}', options: { pick: ['a', 'z'] } });
  assert.equal((await executePlan(plan)).output, '{"a":{"x":1,"y":2},"z":5}');
  const preserve = fixture({ operation: 'json.transform', input: '{"z":5,"a":1}', options: { pick: ['z', 'a'], sort_keys: false } });
  assert.equal((await executePlan(preserve)).output, '{"z":5,"a":1}');
});

test('prototype-like data keys remain data rather than changing host prototypes', async () => {
  const plan = fixture({ operation: 'json.transform', input: '{"__proto__":{"polluted":true},"constructor":"data"}', options: { pick: ['__proto__', 'constructor'] } });
  assert.equal((await executePlan(plan)).output, '{"__proto__":{"polluted":true},"constructor":"data"}'); assert.equal({}.polluted, undefined);
});

test('shell and JavaScript injection strings are processed as data only', async () => {
  const input = '$(touch /tmp/trix-must-not-run); globalThis.process.exit(99)';
  assert.equal((await executePlan(fixture({ input }))).output, input);
});

test('pre-cancellation, cancellation during worker startup and deadline exhaustion are truthful', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(executePlan(fixture(), { signal: controller.signal }), code('CANCELLED'));
  const active = new AbortController(); const pending = executePlan(fixture({ input: 'a'.repeat(100_000) }), { signal: active.signal }); active.abort();
  await assert.rejects(pending, code('CANCELLED'));
  await assert.rejects(executePlan(fixture(), { timeoutMs: 1 }), code('DEADLINE_EXCEEDED'));
  await assert.rejects(executePlan(fixture(), { timeoutMs: 0 }), code('INVALID_ARGUMENT'));
});

test('concurrent built-in workers do not share input state', async () => {
  const results = await Promise.all(['a', 'b', 'ç'].map(input => executePlan(fixture({ input, options: { case: 'upper' } }))));
  assert.deepEqual(results.map(r => r.output), ['A', 'B', 'Ç']);
});

test('bundle rejects unrelated or modified execution evidence', async () => {
  const plan = fixture(), result = await executePlan(plan);
  assert.throws(() => buildIntegrationFiles(plan, { ...result, output: 'changed' }), code('EVIDENCE_MISMATCH'));
  assert.throws(() => buildIntegrationFiles(fixture({ input: 'other' }), result), code('EVIDENCE_MISMATCH'));
});

test('generated text integration consumes real configuration and exposes a callable operation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'trix-text-integration-'));
  try {
    const plan = fixture({ input: '  Alpha\r\nBeta  ', options: { trim: true, case: 'lower' } });
    const result = await executePlan(plan), files = buildIntegrationFiles(plan, result);
    assert.deepEqual(Object.keys(files).sort(), ['trix.integration.json', 'trix.integration.mjs']);
    await Promise.all(Object.entries(files).map(([name, content]) => writeFile(join(directory, name), content)));
    const module = await import(pathToFileURL(join(directory, 'trix.integration.mjs')).href);
    assert.equal(module.execute(), 'alpha\nbeta'); assert.equal(module.execute({ input: '  GAMMA\rDELTA  ' }), 'gamma\ndelta');
    assert.equal(module.manifest.plan_id, plan.id);
    assert.equal(JSON.parse(await readFile(join(directory, 'trix.integration.json'), 'utf8')).expected_output_sha256, result.evidence.output_sha256);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('generated JSON integration matches worker semantics and rejects ambiguous new inputs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'trix-json-integration-'));
  try {
    const plan = fixture({ operation: 'json.transform', input: '{"c":9,"a":{"z":2,"b":1}}', options: { pick: ['a'] } });
    const files = buildIntegrationFiles(plan, await executePlan(plan));
    await Promise.all(Object.entries(files).map(([name, content]) => writeFile(join(directory, name), content)));
    const module = await import(pathToFileURL(join(directory, 'trix.integration.mjs')).href);
    assert.equal(module.execute(), '{"a":{"b":1,"z":2}}');
    assert.throws(() => module.execute({ input: '{"a":1,"a":2}' }));
    assert.throws(() => module.execute({ input: '{"a":9007199254740993}' }));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('published schema identifies the same bounded profile without claiming semantic validation', async () => {
  const schema = JSON.parse(await readFile(new URL('../schemas/plan.schema.json', import.meta.url), 'utf8'));
  assert.equal(schema.properties.schema_version.const, fixture().schema_version);
  assert.equal(schema.properties.nodes.maxItems, 1); assert.equal(schema.additionalProperties, false); assert.match(schema.description, /use verifyPlan/);
});
