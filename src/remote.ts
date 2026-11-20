/**
 * JSON-RPC client for the CRYPTYX remote MCP connector (`<CRYPTYX_API_URL>/api/mcp`).
 *
 * The npm package does not reimplement any tool. Every call is forwarded to the
 * remote connector with the caller's `cx_*` API key, so results (plain-English
 * display names, payload shaping, the attribution footer, quotas and tier
 * checks) are exactly what the remote connector returns.
 */
import type { CryptyxConfig } from './api-client.js';

/** Remote tools can take up to ~120 s (full-history backtests); the remote route allows 300 s. */
export const CALL_TIMEOUT_MS = 290_000;
/** tools/list is quick; fall back to the bundled list rather than keep a client waiting. */
export const LIST_TIMEOUT_MS = 8_000;

/** A JSON-RPC error, carried through to the MCP client unchanged (code, message, data). */
export class RpcError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'RpcError';
  }
}

/** The connector answered with a non-2xx HTTP status (for example 401 for a missing or revoked key). */
export class RemoteHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`CRYPTYX remote MCP returned HTTP ${status}: ${body.slice(0, 200)}`);
    this.name = 'RemoteHttpError';
  }
}

export function remoteEndpoint(cfg: CryptyxConfig): string {
  return new URL('/api/mcp', cfg.baseUrl).toString();
}

interface JsonRpcResponse {
  jsonrpc?: string;
  id?: unknown;
  result?: unknown;
  error?: { code?: unknown; message?: unknown; data?: unknown };
}

/** Parse a JSON body, or the last `data:` event of an SSE body (the connector answers JSON today). */
function parseBody(text: string, contentType: string): JsonRpcResponse {
  if (contentType.includes('text/event-stream')) {
    const events = text
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim())
      .filter(Boolean);
    const last = events[events.length - 1];
    if (!last) throw new Error('CRYPTYX remote MCP returned an empty event stream');
    return JSON.parse(last) as JsonRpcResponse;
  }
  return JSON.parse(text) as JsonRpcResponse;
}

let nextId = 1;

/**
 * Send one JSON-RPC request to the remote connector and return its `result`.
 * A JSON-RPC error is thrown as RpcError; an HTTP failure as RemoteHttpError.
 */
export async function remoteRpc(
  cfg: CryptyxConfig,
  userAgent: string,
  method: string,
  params: Record<string, unknown>,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(remoteEndpoint(cfg), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${cfg.apiKey}`,
        'User-Agent': userAgent,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new RemoteHttpError(res.status, text);
    const body = parseBody(text, res.headers.get('content-type') ?? '');
    if (body.error) {
      const code = typeof body.error.code === 'number' ? body.error.code : -32603;
      const message = typeof body.error.message === 'string' ? body.error.message : 'CRYPTYX remote MCP error';
      throw new RpcError(code, message, body.error.data);
    }
    return body.result;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`CRYPTYX remote MCP did not answer within ${Math.round(timeoutMs / 1000)} s. Try again in a moment.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
