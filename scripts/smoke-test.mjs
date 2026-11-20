#!/usr/bin/env node
// Offline smoke test for the built stdio server (run `npm test`, which builds first).
// Speaks MCP over stdio with no API key and no network:
//   initialize → instructions; tools/list → the bundled connector tools;
//   a retired tool → the connector's refusal; a current tool → the missing-key message;
//   an unknown tool → "Unknown tool".
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const serverPath = join(here, '..', 'dist', 'server.js');

const env = { ...process.env, CRYPTYX_API_KEY: '', XDG_CONFIG_HOME: join(here, '.no-config') };
const child = spawn(process.execPath, [serverPath], { env, stdio: ['pipe', 'pipe', 'inherit'] });

const pending = new Map();
let buffer = '';
child.stdout.on('data', (chunk) => {
  buffer += chunk.toString('utf8');
  let nl;
  while ((nl = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg);
    }
  }
});

let id = 0;
function request(method, params = {}) {
  const msgId = ++id;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), 10_000);
    pending.set(msgId, (msg) => {
      clearTimeout(timer);
      resolve(msg);
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: msgId, method, params }) + '\n');
  });
}
const notify = (method, params = {}) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');

const EXPECTED_TOOLS = [
  'get_cryptyx_overview', 'get_coin_study', 'get_episode_study', 'check_coverage', 'get_data_liveness',
  'get_price_history', 'analyze_metric', 'scan_metric_universe', 'get_live_prices', 'get_featured_metrics',
  'analyze_metrics_composite',
];

try {
  const init = await request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'smoke-test', version: '0' },
  });
  assert.equal(init.result.serverInfo.name, 'cryptyx');
  assert.match(init.result.instructions, /^CRYPTYX — Digital Asset Intelligence\. Institutional-grade quant intelligence/);
  assert.ok(init.result.capabilities.tools, 'tools capability');
  notify('notifications/initialized');

  const list = await request('tools/list');
  const names = list.result.tools.map((t) => t.name);
  assert.deepEqual([...names].sort(), [...EXPECTED_TOOLS].sort());
  for (const t of list.result.tools) {
    assert.equal(t.inputSchema.type, 'object', `${t.name} inputSchema`);
    assert.equal(t.annotations.readOnlyHint, true, `${t.name} readOnlyHint`);
  }

  const retired = await request('tools/call', { name: 'get_market_snapshot', arguments: {} });
  assert.equal(retired.error?.code, -32602);
  assert.equal(
    retired.error.message,
    'Tool "get_market_snapshot" is no longer part of the CRYPTYX connector. Your app is using an out-of-date tool list: disconnect and reconnect the CRYPTYX connector to refresh it.',
  );
  assert.deepEqual(retired.error.data, { reason: 'stale_tool_list', tool: 'get_market_snapshot' });

  const npmOnly = await request('tools/call', { name: 'get_boundary_watchlist', arguments: {} });
  assert.equal(npmOnly.error?.data?.reason, 'stale_tool_list');

  const noKey = await request('tools/call', { name: 'get_coin_study', arguments: { asset: 'BTC' } });
  assert.equal(noKey.result.isError, true);
  assert.match(noKey.result.content[0].text, /CRYPTYX_API_KEY is not set/);

  const unknown = await request('tools/call', { name: 'not_a_tool', arguments: {} });
  assert.equal(unknown.error?.message, 'Unknown tool: not_a_tool');

  console.log(`smoke test passed: ${names.length} tools, retired-tool refusal, missing-key and unknown-tool paths`);
} catch (err) {
  console.error('smoke test failed:', err);
  process.exitCode = 1;
} finally {
  child.kill();
}
