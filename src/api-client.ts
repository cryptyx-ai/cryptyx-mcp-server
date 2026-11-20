/**
 * Shared CRYPTYX API client — used by both the MCP server (stdio) and the CLI.
 *
 * Resolves configuration from (in priority order):
 *   1. Explicit overrides (function params)
 *   2. Environment variables (CRYPTYX_API_KEY, CRYPTYX_API_URL)
 *   3. Persistent config file (~/.config/cryptyx/config.json)
 *   4. Defaults (https://cryptyx.ai, no key)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ── Config resolution ───────────────────────────────────────────────

export interface CryptyxConfig {
  baseUrl: string;
  apiKey: string;
}

const CONFIG_DIR = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'cryptyx');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface StoredConfig {
  apiKey?: string;
  apiUrl?: string;
}

function readStoredConfig(): StoredConfig {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as StoredConfig;
  } catch {
    return {};
  }
}

export function writeStoredConfig(config: StoredConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export function clearStoredConfig(): void {
  try {
    writeFileSync(CONFIG_FILE, '{}\n', 'utf-8');
  } catch {
    // Config file doesn't exist — nothing to clear
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function getConfig(overrides?: Partial<CryptyxConfig>): CryptyxConfig {
  const stored = readStoredConfig();
  return {
    baseUrl: overrides?.baseUrl ?? process.env.CRYPTYX_API_URL ?? stored.apiUrl ?? 'https://cryptyx.ai',
    apiKey: overrides?.apiKey ?? process.env.CRYPTYX_API_KEY ?? stored.apiKey ?? '',
  };
}

// ── API helpers ─────────────────────────────────────────────────────

export class CryptyxApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: string,
  ) {
    super(`CRYPTYX API ${statusCode}: ${body.slice(0, 200)}`);
    this.name = 'CryptyxApiError';
  }
}

function apiHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json', 'X-MCP-Client': 'true' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

export async function apiFetch(
  path: string,
  params?: Record<string, string | undefined>,
  config?: CryptyxConfig,
): Promise<unknown> {
  const cfg = config ?? getConfig();
  const url = new URL(path, cfg.baseUrl);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), { headers: apiHeaders(cfg.apiKey) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new CryptyxApiError(res.status, text);
  }
  return res.json();
}

export async function apiPost(
  path: string,
  body: unknown,
  config?: CryptyxConfig,
): Promise<unknown> {
  const cfg = config ?? getConfig();
  const url = new URL(path, cfg.baseUrl);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { ...apiHeaders(cfg.apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new CryptyxApiError(res.status, text);
  }
  return res.json();
}
