#!/usr/bin/env node
/**
 * CRYPTYX MCP server (stdio).
 *
 * A local stdio front for the CRYPTYX remote MCP connector. It lists the same
 * tools, descriptions, schemas and instructions as https://mcp.cryptyx.ai/api/mcp
 * and forwards every tool call there with the caller's `cx_*` API key, so the
 * two surfaces cannot drift apart:
 *
 *   - initialize: the connector's instructions, bundled in src/generated/connector.ts
 *     (generated from the connector source; a CRYPTYX repo test fails on any drift);
 *   - tools/list: the live connector list when an API key is set, else the bundled list;
 *   - tools/call: forwarded to the connector; tools earlier versions listed get the
 *     connector's own refusal.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { getConfig } from './api-client.js';
import { CONNECTOR } from './generated/connector.js';
import { CALL_TIMEOUT_MS, LIST_TIMEOUT_MS, RemoteHttpError, RpcError, remoteRpc } from './remote.js';
import { PACKAGE_VERSION } from './version.js';

const INVALID_PARAMS = -32602;
const ACCOUNT_URL = 'https://cryptyx.ai/account';

const cfg = getConfig();
const userAgent = `cryptyx-mcp-server/${PACKAGE_VERSION} (stdio; node ${process.versions.node})`;

const bundledToolNames = new Set(CONNECTOR.tools.map((t) => t.name));
const retiredToolNames = new Set(CONNECTOR.retiredTools);
/** Tool names from the last live tools/list. The remote connector is the authority on what exists. */
let liveToolNames = new Set<string>();

const staleHostMessage = (tool: string): string => CONNECTOR.staleHostMessageTemplate.replace('{tool}', tool);

function errorResult(text: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text }] };
}

function missingKeyResult(): CallToolResult {
  return errorResult(
    `CRYPTYX_API_KEY is not set. Create an API key at ${ACCOUNT_URL}, then add it to this server's env config as ` +
      'CRYPTYX_API_KEY (or run `npx cryptyx config set-key <key>`) and restart your MCP client.',
  );
}

function httpErrorResult(err: RemoteHttpError): CallToolResult {
  if (err.status === 401 || err.status === 403) {
    return errorResult(
      `CRYPTYX did not accept the API key (HTTP ${err.status}). Check CRYPTYX_API_KEY, or create a new key at ${ACCOUNT_URL}.`,
    );
  }
  return errorResult(`CRYPTYX remote MCP returned HTTP ${err.status}. ${err.body.slice(0, 200)}`.trim());
}

function isTool(value: unknown): value is Tool {
  if (!value || typeof value !== 'object') return false;
  const t = value as Record<string, unknown>;
  return typeof t.name === 'string' && !!t.inputSchema && typeof t.inputSchema === 'object';
}

async function listTools(): Promise<Tool[]> {
  if (cfg.apiKey) {
    try {
      const result = (await remoteRpc(cfg, userAgent, 'tools/list', {}, LIST_TIMEOUT_MS)) as { tools?: unknown };
      if (Array.isArray(result?.tools) && result.tools.length > 0 && result.tools.every(isTool)) {
        liveToolNames = new Set(result.tools.map((t) => t.name));
        return result.tools;
      }
    } catch {
      // Offline, key rejected or connector unreachable: the bundled list is identical at release time.
    }
  }
  return CONNECTOR.tools as Tool[];
}

async function callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  // A tool earlier versions listed: same refusal, code and data as the remote connector.
  if (retiredToolNames.has(name) && !liveToolNames.has(name)) {
    throw new RpcError(INVALID_PARAMS, staleHostMessage(name), { reason: 'stale_tool_list', tool: name });
  }
  if (!cfg.apiKey) {
    if (!bundledToolNames.has(name)) throw new RpcError(INVALID_PARAMS, `Unknown tool: ${name}`);
    return missingKeyResult();
  }
  try {
    return (await remoteRpc(
      cfg,
      userAgent,
      'tools/call',
      { name, arguments: args },
      CALL_TIMEOUT_MS,
    )) as CallToolResult;
  } catch (err) {
    if (err instanceof RpcError) throw err;
    if (err instanceof RemoteHttpError) return httpErrorResult(err);
    return errorResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const server = new Server(
  { name: CONNECTOR.serverName, title: CONNECTOR.serverTitle, version: PACKAGE_VERSION },
  { capabilities: { tools: {} }, instructions: CONNECTOR.instructions },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: await listTools() }));

server.setRequestHandler(CallToolRequestSchema, async (request) =>
  callTool(request.params.name, (request.params.arguments ?? {}) as Record<string, unknown>),
);

await server.connect(new StdioServerTransport());
