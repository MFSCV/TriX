import { parentPort, workerData } from 'node:worker_threads';
import { transformInput, contentDigest, verifyPlan } from './core.mjs';
try {
  const verification = verifyPlan(workerData);
  if (!verification.valid) throw Object.assign(new Error('The worker rejected an invalid plan.'), { code: verification.diagnostics[0].code });
  const output = transformInput(workerData.operation, workerData.input, workerData.options);
  parentPort.postMessage({ output, evidence: { operation: workerData.operation, output_sha256: contentDigest(output), input_sha256: contentDigest(workerData.input), plan_digest: verification.digest, executor: 'trix.builtin-cpu/v1', isolation: 'bounded-reviewed-worker; not an OS security sandbox' } });
} catch (error) { parentPort.postMessage({ error: { code: error.code ?? 'EXECUTION_FAILED', message: error.message } }); }
