import { defineCommand } from 'citty';
import { apiFetch, apiPost, getConfig } from '../api-client.js';
import { printTable, printKeyValue } from '../formatters/table.js';
import { spinner, handleError } from '../formatters/common.js';

const top = defineCommand({
  meta: { name: 'top', description: 'Top 10 signals ranked by 7d information coefficient' },
  args: {
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner('Fetching top signals…');
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const data = await apiFetch('/api/signals/top', undefined, cfg);
      s.succeed('Top signals');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printTable(data);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});

const catalog = defineCommand({
  meta: { name: 'catalog', description: 'All signals with active parameters and 30d trigger stats' },
  args: {
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner('Fetching signal catalog…');
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const data = await apiFetch('/api/signals/catalog', undefined, cfg);
      s.succeed('Signal catalog');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printTable(data);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});

const explain = defineCommand({
  meta: { name: 'explain', description: 'Why a signal fired (or didn\'t) for a specific asset/day' },
  args: {
    signal: { type: 'positional', description: 'Signal ID', required: true },
    asset: { type: 'positional', description: 'Asset symbol', required: true },
    day: { type: 'positional', description: 'Date YYYY-MM-DD', required: true },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner(`Explaining ${args.signal} for ${args.asset} on ${args.day}…`);
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const data = await apiFetch('/api/signals/explain', {
        signal_id: args.signal,
        asset: args.asset,
        day: args.day,
      }, cfg);
      s.succeed('Signal explanation');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printKeyValue(data as Record<string, unknown>);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});

const backtest = defineCommand({
  meta: { name: 'backtest', description: 'Backtest a signal over a date range' },
  args: {
    signal: { type: 'positional', description: 'Signal ID', required: true },
    from: { type: 'string', description: 'Start date YYYY-MM-DD', required: true },
    to: { type: 'string', description: 'End date YYYY-MM-DD', required: true },
    dryrun: { type: 'boolean', description: 'Evaluate without writing to signal_log' },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner(`Backtesting ${args.signal} from ${args.from} to ${args.to}…`);
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const data = await apiPost('/api/signals/backtest', {
        signal_id: args.signal,
        from: args.from,
        to: args.to,
        dryrun: args.dryrun ?? false,
      }, cfg);
      s.succeed('Backtest complete');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printKeyValue(data as Record<string, unknown>);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});

const fork = defineCommand({
  meta: { name: 'fork', description: 'Create a new inactive parameter variant of a signal' },
  args: {
    signal: { type: 'positional', description: 'Signal ID to fork', required: true },
    params: { type: 'string', description: 'New params as JSON (e.g. \'{"z_threshold": 2.5}\')', required: true },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner(`Forking ${args.signal}…`);
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const parsed = JSON.parse(args.params) as Record<string, unknown>;
      const data = await apiPost('/api/signals/fork', {
        signal_id: args.signal,
        params: parsed,
      }, cfg);
      s.succeed('Signal forked');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printKeyValue(data as Record<string, unknown>);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});

const simulate = defineCommand({
  meta: { name: 'simulate', description: 'Estimate trigger rate if a threshold were changed' },
  args: {
    signal: { type: 'positional', description: 'Signal ID', required: true },
    key: { type: 'string', description: 'Parameter key to simulate (e.g. z_threshold)', required: true },
    value: { type: 'string', description: 'Proposed threshold value', required: true },
    day: { type: 'string', description: 'Date to simulate on (YYYY-MM-DD, default latest)' },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner(`Simulating ${args.signal} with ${args.key}=${args.value}…`);
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const body: Record<string, unknown> = {
        signal_id: args.signal,
        threshold_key: args.key,
        threshold_value: Number(args.value),
      };
      if (args.day) body.asof_day = args.day;
      const data = await apiPost('/api/signals/simulate', body, cfg);
      s.succeed('Simulation complete');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printKeyValue(data as Record<string, unknown>);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});

export default defineCommand({
  meta: { name: 'signals', description: 'Signal triggers, catalog, backtest, fork, and simulation' },
  args: {
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  subCommands: { top, catalog, explain, backtest, fork, simulate },
  async run({ args }) {
    // Default: show today's active signals
    const s = spinner('Fetching active signals…');
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const data = await apiFetch('/api/signals/active', undefined, cfg);
      s.succeed('Active signals');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printTable(data);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});
