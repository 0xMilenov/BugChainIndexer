/**
 * evmbench API client for triggering and polling AI audit jobs.
 * Requires EVMBENCH_API_URL env var (e.g. http://localhost:1337).
 */

const archiver = require('archiver');
const FormData = require('form-data');

const EVMBENCH_API_URL = (process.env.EVMBENCH_API_URL || 'http://localhost:1337').replace(/\/$/, '');
const DEFAULT_MODEL = 'codex-gpt-5.2';

/**
 * Build a zip buffer containing a single Solidity file.
 * @param {string} sourceCode - Contract source code content
 * @param {string} fileName - Filename (must end with .sol for evmbench validation)
 * @returns {Promise<Buffer>}
 */
function buildSourceZip(sourceCode, fileName) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    const safeName = fileName && fileName.toLowerCase().endsWith('.sol')
      ? fileName
      : (fileName ? `${fileName.replace(/\.sol$/i, '')}.sol` : 'contract.sol');

    archive.append(sourceCode, { name: safeName });
    archive.finalize();
  });
}

/**
 * Start an evmbench audit job.
 * @param {string} sourceCode - Contract source code
 * @param {string|null} contractFileName - Preferred filename (e.g. BlurPool.sol)
 * @param {string} openaiKey - User's OpenAI API key
 * @param {string} [model] - Model key (default: codex-gpt-5.2)
 * @returns {Promise<{ jobId: string, status: string }>}
 */
async function startAuditJob(sourceCode, contractFileName, openaiKey, model = DEFAULT_MODEL) {
  const zipBuffer = await buildSourceZip(sourceCode, contractFileName || 'contract.sol');

  const formData = new FormData();
  formData.append('file', zipBuffer, { filename: 'contract.zip', contentType: 'application/zip' });
  formData.append('model', model);
  formData.append('openai_key', openaiKey);

  const bodyBuffer = formData.getBuffer();
  const headers = formData.getHeaders();
  headers['Content-Length'] = String(bodyBuffer.length);

  const response = await fetch(`${EVMBENCH_API_URL}/v1/jobs/start`, {
    method: 'POST',
    body: bodyBuffer,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail || text;
    } catch (_) {}
    throw new Error(`evmbench start failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  return {
    jobId: data.job_id,
    status: data.status || 'queued',
  };
}

/**
 * Get evmbench job status (full job response for progress display).
 * @param {string} jobId - evmbench job UUID
 * @returns {Promise<{ status: string, result?: object, error?: string, model?: string, file_name?: string, created_at?: string, started_at?: string, finished_at?: string, queue_position?: number }>}
 */
async function getJobStatus(jobId) {
  const response = await fetch(`${EVMBENCH_API_URL}/v1/jobs/${jobId}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`evmbench status failed (${response.status})`);
  }

  const data = await response.json();
  return {
    status: data.status,
    result: data.result ?? undefined,
    error: data.error ?? undefined,
    model: data.model,
    file_name: data.file_name,
    created_at: data.created_at,
    started_at: data.started_at,
    finished_at: data.finished_at,
    queue_position: data.queue_position,
  };
}

module.exports = {
  startAuditJob,
  getJobStatus,
  buildSourceZip,
};
