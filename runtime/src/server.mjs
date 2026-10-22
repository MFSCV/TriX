import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseDataJSON } from './core.mjs';

const STATIC_ROOT = fileURLToPath(new URL('../../environment-lab/dist/', import.meta.url));
const MAX_BODY = 1024 * 1024;
const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']], ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']], ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/model.mjs', ['model.mjs', 'text/javascript; charset=utf-8']], ['/agents.mjs', ['agents.mjs', 'text/javascript; charset=utf-8']],
  ['/runtime-client.mjs', ['runtime-client.mjs', 'text/javascript; charset=utf-8']]
]);
const RPC = {
  projectBind: 1, projectList: 0, projectInspect: 1, projectRevoke: 1,
  configValidate: 1, configGenerate: 1, planCreate: 1, planValidate: 1, planFromPrompt: 1,
  taskSubmit: 1, taskGet: 1, taskList: 0, taskCancel: 1, taskResume: 1, taskEvents: 2, taskWait: 2,
  artifactGet: 1, evidenceGet: 1, changeApply: 1, changeVerify: 1, changeRecover: 1, doctor: 0,
  connectionList: 0, connectionGet: 1, connectionTest: 1, connectionRevoke: 1, connectionConfigure: 1, connectionCall: 2, deliveryPreview: 2, deliverySubmit: 2, deliveryReconcile: 2,
  skillList: 0, skillGet: 1, auditGet: 0, auditVerify: 0
};
const fail = (code, message, status = 400) => Object.assign(new Error(message), { code, httpStatus: status });

function body(req) {
  return new Promise((resolve, reject) => {
    let bytes = 0, rejected = false;
    const chunks = [];
    const length = req.headers['content-length'];
    if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY)) {
      req.resume(); reject(fail('INVALID_ARGUMENT', 'Request body exceeds the 1 MiB limit.', 413)); return;
    }
    req.on('data', chunk => {
      if (rejected) return;
      bytes += chunk.length;
      if (bytes > MAX_BODY) {
        rejected = true; chunks.length = 0; reject(fail('INVALID_ARGUMENT', 'Request body exceeds the 1 MiB limit.', 413));
      } else chunks.push(chunk);
    });
    req.on('end', () => {
      if (rejected) return;
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const value = raw ? parseDataJSON(raw) : {};
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail('INVALID_ARGUMENT', 'A JSON object is required.');
        resolve(value);
      } catch (error) { reject(error.code ? error : fail('INVALID_ARGUMENT', 'Invalid JSON request body.')); }
    });
    req.on('error', reject);
    req.on('aborted', () => reject(fail('INVALID_ARGUMENT', 'Request was interrupted.')));
  });
}

function statusCode(error) {
  if (error.httpStatus) return error.httpStatus;
  return ({ INVALID_ARGUMENT: 400, INVALID_PLAN: 400, INVALID_JSON: 400, DUPLICATE_KEY: 400,
    UNKNOWN_FIELD: 400, MISSING_DEPENDENCY: 400, PLAN_CYCLE: 400, DIGEST_MISMATCH: 400,
    UNSUPPORTED_OPERATION: 400, UNSUPPORTED_PLAN_PROFILE: 400, UNSUPPORTED_SCHEMA: 400,
    LIMIT_EXCEEDED: 413, AUTHENTICATION_REQUIRED: 401, PERMISSION_DENIED: 403,
    APPROVAL_REQUIRED: 403, NOT_FOUND: 404, REVISION_CONFLICT: 409, IDEMPOTENCY_CONFLICT: 409,
    INCOMPATIBLE_TARGET: 409, EFFECT_UNKNOWN: 409, EVIDENCE_MISMATCH: 409, CANCELLED: 409,
    WAIT_TIMEOUT: 408, QUOTA_EXCEEDED: 429, BUDGET_EXCEEDED: 429, CAPABILITY_UNAVAILABLE: 503,
    DEPENDENCY_UNAVAILABLE: 503, MODEL_UNAVAILABLE: 503, MODEL_NOT_CONFIGURED: 503,
    MODEL_CONFIGURATION_INVALID: 503, MODEL_OUTPUT_INVALID: 502, MODEL_TIMEOUT: 504 })[error.code] || 500;
}
function secureHeaders(res) {
  for (const [key, value] of Object.entries({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" })) res.setHeader(key, value);
}
function json(res, code, data, accepted = false) {
  res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ schema_version: 'trix.api/v1', status: accepted ? 'accepted' : 'ok', data }));
}

/** Private single-owner loopback profile; the token is never injected into HTML. */
export async function startServer({ stateDir, port = 0, token = randomBytes(32).toString('hex'), workspaceRoot = process.cwd(), model, service: suppliedService } = {}) {
  if (!Number.isInteger(Number(port)) || Number(port) < 0 || Number(port) > 65535) throw fail('INVALID_ARGUMENT', 'Invalid listen port.');
  if (typeof token !== 'string' || token.length < 24 || token.length > 4096 || /[\r\n]/.test(token)) throw fail('INVALID_ARGUMENT', 'The owner token must contain 24–4096 characters without newlines.');
  const service = suppliedService || new (await import('./service.mjs')).TriXService({ stateDir, workspaceRoot: path.resolve(workspaceRoot), model });
  const tokenBytes = Buffer.from(token);
  let origin;
  const server = http.createServer(async (req, res) => {
    secureHeaders(res);
    try {
      if (req.headers.host !== new URL(origin).host) throw fail('PERMISSION_DENIED', 'Unexpected request host.', 403);
      if (req.headers.origin && req.headers.origin !== origin) throw fail('PERMISSION_DENIED', 'Cross-origin requests are not permitted.', 403);
      if (req.headers['sec-fetch-site'] === 'cross-site') throw fail('PERMISSION_DENIED', 'Cross-site requests are not permitted.', 403);
      const url = new URL(req.url, origin);
      if (url.username || url.password || url.origin !== origin) throw fail('PERMISSION_DENIED', 'Unexpected request target.', 403);
      const method = req.method || 'GET';
      if (url.pathname === '/health' && method === 'GET') return json(res, 200, { service: 'TriX', ready: true });
      const staticFile = STATIC_FILES.get(url.pathname);
      if (staticFile && (method === 'GET' || method === 'HEAD')) {
        const bytes = await readFile(path.join(STATIC_ROOT, staticFile[0]));
        res.statusCode = 200; res.setHeader('Content-Type', staticFile[1]); return res.end(method === 'HEAD' ? undefined : bytes);
      }
      const header = req.headers.authorization || '';
      const candidate = header.startsWith('Bearer ') ? Buffer.from(header.slice(7)) : Buffer.alloc(0);
      if (candidate.length !== tokenBytes.length || !timingSafeEqual(candidate, tokenBytes)) throw fail('AUTHENTICATION_REQUIRED', 'A valid owner access token is required.', 401);
      if (method === 'POST' && !(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw fail('INVALID_ARGUMENT', 'Use application/json for mutations.', 415);
      const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      if (segments[0] !== 'api' || segments[1] !== 'v1') throw fail('NOT_FOUND', 'Unknown endpoint.', 404);
      const route = segments.slice(2), exact = name => route.length === 1 && route[0] === name;
      if (exact('rpc') && method === 'POST') {
        const value = await body(req);
        if (typeof value.method !== 'string' || !Object.hasOwn(RPC, value.method)) throw fail('INVALID_ARGUMENT', 'Unknown RPC operation.');
        if (!Array.isArray(value.params) || value.params.length > 8 || value.params.length > RPC[value.method] || (RPC[value.method] > 0 && value.params.length < 1)) throw fail('INVALID_ARGUMENT', 'Invalid RPC parameters.');
        const params = value.params;
        if (value.method === 'projectBind') {
          const binding = params[0];
          if (!binding || typeof binding !== 'object' || Array.isArray(binding)) throw fail('INVALID_ARGUMENT', 'Invalid project binding.');
          params[0] = { id: binding.id, root: binding.root };
        }
        if (typeof service[value.method] !== 'function') throw fail('CAPABILITY_UNAVAILABLE', 'The operation is not available in this runtime.', 503);
        const result = await service[value.method](...params);
        const accepted = value.method === 'taskSubmit' || value.method === 'changeApply';
        return json(res, accepted ? 202 : 200, result, accepted);
      }
      if (exact('doctor') && method === 'GET') return json(res, 200, await service.doctor());
      if (exact('projects') && method === 'GET') return json(res, 200, await service.projectList());
      if (exact('projects') && method === 'POST') { const value = await body(req); return json(res, 201, await service.projectBind({ id: value.id, root: value.root })); }
      if (route[0] === 'projects' && route.length === 2 && method === 'GET') return json(res, 200, await service.projectInspect(route[1]));
      if (route[0] === 'config' && route.length === 2 && ['validate', 'generate'].includes(route[1]) && method === 'POST') { const value = await body(req); return json(res, 200, await service[route[1] === 'validate' ? 'configValidate' : 'configGenerate'](value.scenario ?? value)); }
      if (exact('plans') && method === 'POST') {
        const value = await body(req);
        return json(res, 200, await service.planCreate({ projectId: value.projectId, input: value.input, operation: value.operation, options: value.options, goal: value.goal, sourceRevision: value.sourceRevision, target: value.target }));
      }
      if (exact('chat') && method === 'POST') { const value = await body(req); return json(res, 200, await service.planFromPrompt({ projectId: value.projectId, prompt: value.prompt, input: value.input })); }
      if (exact('tasks') && method === 'GET') return json(res, 200, await service.taskList());
      if (exact('tasks') && method === 'POST') {
        const value = await body(req);
        if (value.apply !== undefined && typeof value.apply !== 'boolean') throw fail('INVALID_ARGUMENT', 'apply must be a boolean.');
        return json(res, 202, await service.taskSubmit({ projectId: value.projectId, plan: value.plan, apply: value.apply === true, idempotencyKey: value.idempotencyKey }), true);
      }
      if (route[0] === 'tasks' && route.length === 2 && method === 'GET') return json(res, 200, await service.taskGet(route[1]));
      if (route[0] === 'tasks' && route.length === 3) {
        const [ , id, action] = route;
        if (method === 'GET' && ['events', 'artifact', 'evidence'].includes(action)) {
          const after = url.searchParams.get('after') ?? '0';
          if (!/^\d+$/.test(after) || !Number.isSafeInteger(Number(after))) throw fail('INVALID_ARGUMENT', 'Invalid event cursor.');
          return json(res, 200, action === 'events' ? await service.taskEvents(id, { after: Number(after) }) : await service[action === 'artifact' ? 'artifactGet' : 'evidenceGet'](id));
        }
        const mutations = { cancel: 'taskCancel', resume: 'taskResume', apply: 'changeApply', verify: 'changeVerify', recover: 'changeRecover' };
        if (method === 'POST' && Object.hasOwn(mutations, action)) {
          const value = await body(req), result = await service[mutations[action]](id, value);
          const accepted = action === 'apply' || (action === 'resume' && ['QUEUED', 'RUNNING'].includes(result?.lifecycle));
          return json(res, accepted ? 202 : 200, result, accepted);
        }
      }
      throw fail('NOT_FOUND', 'Unknown endpoint.', 404);
    } catch (error) {
      if (res.headersSent) return res.end();
      const status = statusCode(error); res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ schema_version: 'trix.api/v1', status: 'error', error: { code: error.code || 'INTERNAL_ERROR', message: status === 500 ? 'The request failed. Inspect the local server evidence.' : error.message } }));
    }
  });
  server.requestTimeout = 30_000; server.headersTimeout = 10_000; server.keepAliveTimeout = 1000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(Number(port), '127.0.0.1', () => { origin = `http://127.0.0.1:${server.address().port}`; server.removeListener('error', reject); resolve(); }); });
  return { server, url: origin, token, service, async close() { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); if (!suppliedService) await service.close(); } };
}
