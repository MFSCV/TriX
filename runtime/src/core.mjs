import { createHash } from 'node:crypto';

export const PLAN_SCHEMA = 'trix.plan/v1';
export const MAX_INPUT_BYTES = 1024 * 1024;
const MAX_DEPTH = 64;
const MAX_VALUES = 100_000;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HASH = /^[a-f0-9]{64}$/;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

export class TriXError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'TriXError';
    this.code = code;
    this.details = details;
  }
}

const fail = (code, message, path = '') => { throw new TriXError(code, message, { path }); };
const checkKeys = (value, keys, path) => {
  if (!plain(value)) fail('INVALID_ARGUMENT', 'Expected a plain object.', path);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !keys.includes(key)) fail('UNKNOWN_FIELD', `Unknown field: ${String(key)}.`, `${path}/${String(key)}`);
  }
};
const byteLength = value => Buffer.byteLength(value, 'utf8');

/** Canonical UTF-8 JSON profile: sorted object keys, array order retained, finite numbers only. */
export function canonicalize(value) {
  const ancestors = new Set();
  let count = 0;
  function encode(item, depth) {
    if (++count > MAX_VALUES || depth > MAX_DEPTH) fail('LIMIT_EXCEEDED', 'Value exceeds the canonical encoding limits.');
    if (item === null || typeof item === 'boolean' || typeof item === 'string') return JSON.stringify(item);
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) fail('INVALID_ARGUMENT', 'Non-finite numbers are not allowed.');
      return JSON.stringify(item);
    }
    if (typeof item !== 'object') fail('INVALID_ARGUMENT', 'Unsupported value in canonical JSON.');
    if (ancestors.has(item)) fail('INVALID_ARGUMENT', 'Cyclic values are not allowed.');
    if (!Array.isArray(item) && !plain(item)) fail('INVALID_ARGUMENT', 'Only plain JSON objects are allowed.');
    if (Object.getOwnPropertySymbols(item).length) fail('INVALID_ARGUMENT', 'Symbol properties are not allowed.');
    const descriptors = Object.getOwnPropertyDescriptors(item);
    if (Object.values(descriptors).some(d => d.get || d.set)) fail('INVALID_ARGUMENT', 'Accessors are not allowed in JSON values.');
    if (Object.entries(descriptors).some(([key, d]) => !d.enumerable && !(Array.isArray(item) && key === 'length'))) fail('INVALID_ARGUMENT', 'Non-enumerable JSON properties are not allowed.');
    ancestors.add(item);
    let result;
    if (Array.isArray(item)) {
      if (Object.keys(item).some((key, index) => key !== String(index)) || Object.keys(item).length !== item.length) fail('INVALID_ARGUMENT', 'Sparse arrays and extra array properties are not allowed.');
      result = '[' + item.map(v => encode(v, depth + 1)).join(',') + ']';
    } else {
      result = '{' + Object.keys(item).sort().map(k => JSON.stringify(k) + ':' + encode(item[k], depth + 1)).join(',') + '}';
    }
    ancestors.delete(item);
    return result;
  }
  const encoded = encode(value, 0);
  if (byteLength(encoded) > MAX_INPUT_BYTES * 8) fail('LIMIT_EXCEEDED', 'Canonical value is too large.');
  return encoded;
}

export const digest = value => createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
export const contentDigest = value => createHash('sha256').update(value, 'utf8').digest('hex');

/** Parse bounded JSON while rejecting duplicate keys, excessive nesting and non-finite numbers. */
export function parseDataJSON(text) {
  if (typeof text !== 'string' || byteLength(text) > MAX_INPUT_BYTES) fail('INVALID_ARGUMENT', 'JSON input must be a bounded UTF-8 string.', '/input');
  let at = 0;
  let values = 0;
  const whitespace = () => { while (/[\x20\t\r\n]/.test(text[at] ?? '') && at < text.length) at++; };
  function string() {
    const start = at++;
    while (at < text.length) {
      const c = text[at++];
      if (c === '"') {
        try { return JSON.parse(text.slice(start, at)); } catch { fail('INVALID_JSON', 'Invalid JSON string.', '/input'); }
      }
      if (c === '\\') at++;
      else if (c.charCodeAt(0) < 32) fail('INVALID_JSON', 'Invalid control character in JSON string.', '/input');
    }
    fail('INVALID_JSON', 'Unterminated JSON string.', '/input');
  }
  function value(depth) {
    if (++values > MAX_VALUES || depth > MAX_DEPTH) fail('LIMIT_EXCEEDED', 'JSON input exceeds nesting/value limits.', '/input');
    whitespace();
    const c = text[at];
    if (c === '"') return string();
    if (c === '{') {
      at++; whitespace();
      const result = Object.create(null), keys = new Set();
      if (text[at] === '}') { at++; return result; }
      for (;;) {
        whitespace();
        if (text[at] !== '"') fail('INVALID_JSON', 'Expected JSON object key.', '/input');
        const key = string();
        if (keys.has(key)) fail('DUPLICATE_KEY', `Duplicate JSON key: ${key}.`, '/input');
        keys.add(key); whitespace();
        if (text[at++] !== ':') fail('INVALID_JSON', 'Expected colon after JSON key.', '/input');
        result[key] = value(depth + 1); whitespace();
        const sep = text[at++];
        if (sep === '}') return result;
        if (sep !== ',') fail('INVALID_JSON', 'Expected comma or closing brace.', '/input');
      }
    }
    if (c === '[') {
      at++; whitespace();
      const result = [];
      if (text[at] === ']') { at++; return result; }
      for (;;) {
        result.push(value(depth + 1)); whitespace();
        const sep = text[at++];
        if (sep === ']') return result;
        if (sep !== ',') fail('INVALID_JSON', 'Expected comma or closing bracket.', '/input');
      }
    }
    for (const [token, parsed] of [['true', true], ['false', false], ['null', null]]) {
      if (text.startsWith(token, at)) { at += token.length; return parsed; }
    }
    const match = text.slice(at).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);
    if (match) {
      at += match[0].length;
      const number = Number(match[0]);
      if (!Number.isFinite(number)) fail('INVALID_JSON', 'Non-finite JSON numbers are not allowed.', '/input');
      if (Number.isInteger(number) && !Number.isSafeInteger(number)) fail('INVALID_JSON', 'Integers outside the safe JSON number range must be encoded as strings.', '/input');
      return number;
    }
    fail('INVALID_JSON', 'Invalid JSON value.', '/input');
  }
  const result = value(0); whitespace();
  if (at !== text.length) fail('INVALID_JSON', 'Unexpected trailing JSON content.', '/input');
  return result;
}

function normalizeOptions(operation, options, strict = false) {
  if (operation === 'text.normalize') {
    checkKeys(options, ['trim', 'case', 'newline'], '/options');
    if (own(options, 'trim') && typeof options.trim !== 'boolean') fail('INVALID_ARGUMENT', 'trim must be a boolean.', '/options/trim');
    if (own(options, 'case') && !['preserve', 'upper', 'lower'].includes(options.case)) fail('INVALID_ARGUMENT', 'case must be preserve, upper or lower.', '/options/case');
    if (own(options, 'newline') && options.newline !== 'lf') fail('INVALID_ARGUMENT', 'Only LF newline normalization is supported.', '/options/newline');
    const normalized = { trim: options.trim ?? false, case: options.case ?? 'preserve', newline: 'lf' };
    if (strict && canonicalize(options) !== canonicalize(normalized)) fail('INVALID_PLAN', 'Plan options must explicitly contain normalized defaults.', '/options');
    return normalized;
  }
  if (operation === 'json.transform') {
    checkKeys(options, ['pick', 'sort_keys'], '/options');
    if (own(options, 'sort_keys') && typeof options.sort_keys !== 'boolean') fail('INVALID_ARGUMENT', 'sort_keys must be a boolean.', '/options/sort_keys');
    const normalized = { sort_keys: options.sort_keys ?? true };
    if (own(options, 'pick')) {
      if (!Array.isArray(options.pick) || options.pick.length > 128 || options.pick.some(k => typeof k !== 'string' || k.length > 256) || new Set(options.pick).size !== options.pick.length) fail('INVALID_ARGUMENT', 'pick must contain up to 128 unique bounded property names.', '/options/pick');
      normalized.pick = [...options.pick];
    }
    if (strict && canonicalize(options) !== canonicalize(normalized)) fail('INVALID_PLAN', 'Plan options must explicitly contain normalized defaults.', '/options');
    return normalized;
  }
  fail('UNSUPPORTED_OPERATION', 'The requested operation is not registered.', '/operation');
}

function validateInput(operation, input, options) {
  if (typeof input !== 'string') fail('INVALID_ARGUMENT', 'Input must be a string.', '/input');
  if (!input.isWellFormed()) fail('INVALID_ARGUMENT', 'Input must contain well-formed Unicode.', '/input');
  if (byteLength(input) > MAX_INPUT_BYTES) fail('LIMIT_EXCEEDED', 'Input exceeds 1 MiB.', '/input');
  if (operation === 'json.transform') {
    const parsed = parseDataJSON(input);
    if (!plain(parsed)) fail('INVALID_ARGUMENT', 'json.transform requires a JSON object.', '/input');
    for (const key of options.pick ?? []) if (!own(parsed, key)) fail('INVALID_ARGUMENT', `Selected property does not exist: ${key}.`, '/options/pick');
  }
}

export function createPlan(args) {
  checkKeys(args, ['projectId', 'input', 'operation', 'options', 'sourceRevision', 'target', 'goal'], '');
  const { projectId, input, operation = 'text.normalize', options = {}, sourceRevision, target = 'cpu', goal = '' } = args;
  if (typeof projectId !== 'string' || !ID.test(projectId)) fail('INVALID_ARGUMENT', 'A bounded project identifier is required.', '/project_id');
  if (typeof sourceRevision !== 'string' || sourceRevision.length < 1 || sourceRevision.length > 256) fail('INVALID_ARGUMENT', 'A source revision is required.', '/source_revision');
  if (target !== 'cpu') fail('INCOMPATIBLE_TARGET', 'Only the controlled CPU execution profile is implemented.', '/target');
  if (typeof goal !== 'string' || goal.length > 4000) fail('INVALID_ARGUMENT', 'Goal must contain at most 4,000 characters.', '/goal');
  const normalized = normalizeOptions(operation, options);
  validateInput(operation, input, normalized);
  const plan = { schema_version: PLAN_SCHEMA, project_id: projectId, source_revision: sourceRevision, target, goal, operation, options: normalized, input, nodes: [{ id: 'transform', operation, depends_on: [] }] };
  return { ...plan, id: digest(plan) };
}

export function verifyPlan(plan) {
  try {
    canonicalize(plan);
    checkKeys(plan, ['schema_version', 'project_id', 'source_revision', 'target', 'goal', 'operation', 'options', 'input', 'nodes', 'id'], '');
    if (plan.schema_version !== PLAN_SCHEMA) fail('UNSUPPORTED_SCHEMA', 'Unsupported logical-plan schema.', '/schema_version');
    if (!Array.isArray(plan.nodes) || plan.nodes.length < 1 || plan.nodes.length > 64) fail('INVALID_PLAN', 'Plan node count is outside the bounded profile.', '/nodes');
    const nodes = new Map();
    for (const node of plan.nodes) {
      checkKeys(node, ['id', 'operation', 'depends_on'], '/nodes');
      if (typeof node.id !== 'string' || !ID.test(node.id) || nodes.has(node.id)) fail('INVALID_PLAN', 'Plan node identities must be valid and unique.', '/nodes');
      if (!Array.isArray(node.depends_on) || node.depends_on.length > 64 || node.depends_on.some(d => typeof d !== 'string') || new Set(node.depends_on).size !== node.depends_on.length) fail('INVALID_PLAN', 'Invalid dependency list.', '/nodes');
      if (!['text.normalize', 'json.transform'].includes(node.operation)) fail('UNSUPPORTED_OPERATION', 'Node operation is not registered.', '/nodes');
      nodes.set(node.id, node);
    }
    const visiting = new Set(), done = new Set();
    function visit(id) {
      if (visiting.has(id)) fail('PLAN_CYCLE', 'Plan dependencies contain a cycle.', '/nodes');
      if (done.has(id)) return;
      if (!nodes.has(id)) fail('MISSING_DEPENDENCY', 'A plan dependency does not exist.', '/nodes');
      visiting.add(id);
      for (const dep of nodes.get(id).depends_on) visit(dep);
      visiting.delete(id); done.add(id);
    }
    for (const id of nodes.keys()) visit(id);
    if (plan.nodes.length !== 1 || plan.nodes[0].id !== 'transform' || plan.nodes[0].operation !== plan.operation || plan.nodes[0].depends_on.length) fail('UNSUPPORTED_PLAN_PROFILE', 'This profile executes exactly one registered transform node.', '/nodes');
    const expected = createPlan({ projectId: plan.project_id, sourceRevision: plan.source_revision, target: plan.target, goal: plan.goal, operation: plan.operation, options: plan.options, input: plan.input });
    normalizeOptions(plan.operation, plan.options, true);
    const required = ['schema_version', 'project_id', 'source_revision', 'target', 'goal', 'operation', 'options', 'input', 'nodes', 'id'];
    if (required.some(k => !own(plan, k))) fail('INVALID_PLAN', 'Required plan field is absent.');
    if (typeof plan.id !== 'string' || !HASH.test(plan.id) || plan.id !== expected.id) fail('DIGEST_MISMATCH', 'Logical plan identity does not match its contents.', '/id');
    return { valid: true, diagnostics: [], digest: expected.id };
  } catch (error) {
    return { valid: false, diagnostics: [{ code: error.code ?? 'INVALID_PLAN', severity: 'error', message: error.message, path: error.details?.path ?? '' }], digest: null };
  }
}

/** Reviewed data-only implementation; foreign code is outside this profile. */
export function transformInput(operation, input, options) {
  const normalized = normalizeOptions(operation, options);
  validateInput(operation, input, normalized);
  if (operation === 'text.normalize') {
    let output = input.replace(/\r\n?/g, '\n');
    if (normalized.trim) output = output.trim();
    if (normalized.case === 'upper') output = output.toUpperCase();
    if (normalized.case === 'lower') output = output.toLowerCase();
    return output;
  }
  const parsed = parseDataJSON(input);
  let selected = parsed;
  if (normalized.pick) { selected = Object.create(null); for (const key of normalized.pick) selected[key] = parsed[key]; }
  return normalized.sort_keys ? canonicalize(selected) : JSON.stringify(selected);
}
