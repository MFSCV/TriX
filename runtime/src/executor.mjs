import { Worker } from 'node:worker_threads';
import { TriXError, contentDigest, verifyPlan, canonicalize, parseDataJSON } from './core.mjs';

/** Runs only reviewed built-in operations, not arbitrary-code security isolation. */
export async function executePlan(plan, { signal, timeoutMs = 5000 } = {}) {
  const verified = verifyPlan(plan);
  if (!verified.valid) throw new TriXError(verified.diagnostics[0].code, verified.diagnostics[0].message, { diagnostics: verified.diagnostics });
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) throw new TriXError('INVALID_ARGUMENT', 'Execution timeout must be between 1 and 60,000 milliseconds.');
  if (signal?.aborted) throw new TriXError('CANCELLED', 'Execution was cancelled before dispatch.');
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./builtin-worker.mjs', import.meta.url), { workerData: structuredClone(plan), resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 }, env: {}, execArgv: [] });
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
      worker.terminate().then(() => error ? reject(error) : resolve(result), terminationError => reject(new TriXError('EXECUTION_FAILED', terminationError.message)));
    };
    const abort = () => finish(new TriXError('CANCELLED', 'The controlled CPU worker was cancelled.'));
    const timer = setTimeout(() => finish(new TriXError('DEADLINE_EXCEEDED', 'The controlled CPU worker exceeded its time limit.')), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) abort();
    worker.once('error', error => finish(new TriXError('EXECUTION_FAILED', error.message)));
    worker.once('exit', code => { if (!settled) finish(new TriXError('EXECUTION_FAILED', `The controlled CPU worker exited without a result (${code}).`)); });
    worker.once('message', result => {
      if (result?.error) return finish(new TriXError(result.error.code, result.error.message));
      if (typeof result?.output !== 'string' || result.evidence?.plan_digest !== plan.id || result.evidence.output_sha256 !== contentDigest(result.output)) return finish(new TriXError('EVIDENCE_MISMATCH', 'The controlled worker result does not match its evidence.'));
      finish(null, result);
    });
  });
}

const INTEGRATION_SOURCE = `import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const config = JSON.parse(readFileSync(new URL('./trix.integration.json', import.meta.url), 'utf8'));
const sha = value => createHash('sha256').update(value, 'utf8').digest('hex');
const MAX_INPUT_BYTES = 1048576, MAX_DEPTH = 64, MAX_VALUES = 100000;
const byteLength = value => Buffer.byteLength(value, 'utf8');
const fail = (code, message) => { throw Object.assign(new Error(message), {code}); };
${parseDataJSON.toString()}
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
export function execute({ input = config.input } = {}) {
  if (typeof input !== 'string' || !input.isWellFormed() || Buffer.byteLength(input, 'utf8') > 1048576) throw new Error('Invalid bounded integration input.');
  if (config.schema_version !== 'trix.integration/v1') throw new Error('Unsupported integration schema.');
  const options = config.options;
  let output;
  if (config.operation === 'text.normalize') {
    if (typeof options.trim !== 'boolean' || !['preserve', 'upper', 'lower'].includes(options.case) || options.newline !== 'lf') throw new Error('Invalid text operation options.');
    output = input.replace(/\\r\\n?/g, '\\n');
    if (options.trim) output = output.trim();
    if (options.case === 'upper') output = output.toUpperCase();
    if (options.case === 'lower') output = output.toLowerCase();
  } else if (config.operation === 'json.transform') {
    if (typeof options.sort_keys !== 'boolean' || (options.pick !== undefined && (!Array.isArray(options.pick) || options.pick.length > 128 || options.pick.some(k => typeof k !== 'string')))) throw new Error('Invalid JSON operation options.');
    const parsed = parseDataJSON(input);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected JSON object.');
    let selected = parsed;
    if (options.pick) {
      selected = Object.create(null);
      for (const key of options.pick) { if (!Object.prototype.hasOwnProperty.call(parsed, key)) throw new Error('Missing selected property.'); selected[key] = parsed[key]; }
    }
    output = options.sort_keys ? canonical(selected) : JSON.stringify(selected);
  } else throw new Error('Unsupported integration operation.');
  if (input === config.input && sha(output) !== config.expected_output_sha256) throw new Error('Integration output verification failed.');
  return output;
}
export const manifest = Object.freeze({ schema_version: config.schema_version, operation: config.operation, plan_id: config.plan_id, source_revision: config.source_revision });
`;

export function buildIntegrationFiles(plan, execution) {
  const verification = verifyPlan(plan);
  if (!verification.valid) throw new TriXError('INVALID_PLAN', 'Cannot build integration files from an invalid plan.');
  if (typeof execution?.output !== 'string' || execution.evidence?.plan_digest !== plan.id || execution.evidence?.output_sha256 !== contentDigest(execution.output)) throw new TriXError('EVIDENCE_MISMATCH', 'Cannot build integration files without matching execution evidence.');
  const config = { schema_version: 'trix.integration/v1', plan_id: plan.id, source_revision: plan.source_revision, operation: plan.operation, options: plan.options, input: plan.input, expected_output_sha256: execution.evidence.output_sha256 };
  return { 'trix.integration.json': canonicalize(config) + '\n', 'trix.integration.mjs': INTEGRATION_SOURCE };
}
