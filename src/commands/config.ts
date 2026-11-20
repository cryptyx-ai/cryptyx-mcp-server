import { defineCommand } from 'citty';
import { getConfig, getConfigPath, writeStoredConfig, clearStoredConfig } from '../api-client.js';
import { ok, fail, warn } from '../formatters/common.js';
import pc from 'picocolors';

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? '***' : pc.dim('(not set)');
  return key.slice(0, 6) + '…' + key.slice(-4);
}

const setKey = defineCommand({
  meta: { name: 'set-key', description: 'Save your CRYPTYX API key' },
  args: {
    key: { type: 'positional', description: 'API key (cx_* prefix)', required: true },
  },
  async run({ args }) {
    if (!args.key.startsWith('cx_')) {
      warn('Key does not start with cx_ — are you sure this is a CRYPTYX API key?');
    }
    writeStoredConfig({ apiKey: args.key });
    ok(`API key saved to ${getConfigPath()}`);
    console.log(`  Key: ${maskKey(args.key)}`);
  },
});

const show = defineCommand({
  meta: { name: 'show', description: 'Show current configuration' },
  args: {},
  async run() {
    const cfg = getConfig();
    console.log(`${pc.cyan('Config file:')}  ${getConfigPath()}`);
    console.log(`${pc.cyan('Base URL:')}     ${cfg.baseUrl}`);
    console.log(`${pc.cyan('API key:')}      ${maskKey(cfg.apiKey)}`);
    console.log();
    console.log(pc.dim('Resolution order: --api-key flag > CRYPTYX_API_KEY env > config file > (none)'));
  },
});

const clear = defineCommand({
  meta: { name: 'clear', description: 'Clear saved configuration' },
  args: {},
  async run() {
    clearStoredConfig();
    ok('Configuration cleared');
  },
});

export default defineCommand({
  meta: { name: 'config', description: 'Manage API key and configuration' },
  subCommands: { 'set-key': setKey, show, clear },
});
