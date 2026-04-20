import { defineCommand } from 'citty';
import { apiFetch, apiPost, getConfig } from '../api-client.js';
import { printTable, printKeyValue } from '../formatters/table.js';
import { spinner, handleError } from '../formatters/common.js';

const featured = defineCommand({
  meta: { name: 'featured', description: 'Top-performing metrics by information coefficient (IC)' },
  args: {
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner('Fetching featured metrics…');
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const data = await apiFetch('/api/metrics/slicer/featured', undefined, cfg);
      s.succeed('Featured metrics');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printTable(data);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});

const analyze = defineCommand({
  meta: { name: 'analyze', description: 'Single-metric z-score backtest with forward returns' },
  args: {
    metric: { type: 'positional', description: 'Metric ID (e.g. TR_ADX_14D)', required: true },
    asset: { type: 'positional', description: 'Asset symbol (e.g. BTC)', required: true },
    operator: { type: 'string', description: 'Z-score operator: gt, lt, gte, lte, abs_gt', required: true },
    threshold: { type: 'string', description: 'Z-score threshold value', required: true },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner(`Analyzing ${args.metric} for ${args.asset}…`);
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const data = await apiPost('/api/metrics/slicer', {
        metric_id: args.metric,
        asset: args.asset,
        operator: args.operator,
        threshold: Number(args.threshold),
      }, cfg);
      s.succeed('Metric analysis');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printKeyValue(data as Record<string, unknown>);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});

const scan = defineCommand({
  meta: { name: 'scan', description: 'Scan a metric across all ~200 assets for z-score extremes' },
  args: {
    metric: { type: 'positional', description: 'Metric ID to scan', required: true },
    operator: { type: 'string', description: 'Z-score operator: gt, lt, gte, lte, abs_gt', required: true },
    threshold: { type: 'string', description: 'Z-score threshold value', required: true },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner(`Scanning ${args.metric} across universe…`);
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const data = await apiFetch('/api/metrics/slicer/scan', {
        metric_id: args.metric,
        operator: args.operator,
        threshold: args.threshold,
      }, cfg);
      s.succeed('Universe scan');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printTable(data);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});

const composite = defineCommand({
  meta: { name: 'composite', description: 'Multi-factor z-score intersection backtest (2-4 conditions)' },
  args: {
    asset: { type: 'positional', description: 'Asset symbol (e.g. BTC)', required: true },
    conditions: { type: 'string', description: 'JSON array of conditions, e.g. \'[{"metric_id":"VOL_RV_7D","operator":"gt","threshold":2}]\'', required: true },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner(`Running composite analysis for ${args.asset}…`);
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const conditions = JSON.parse(args.conditions) as Array<{ metric_id: string; operator: string; threshold: number }>;
      const data = await apiPost('/api/metrics/slicer/composite', {
        asset: args.asset,
        conditions,
      }, cfg);
      s.succeed('Composite analysis');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printKeyValue(data as Record<string, unknown>);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});

export default defineCommand({
  meta: { name: 'metrics', description: 'Metric analysis, scanning, and composite backtesting' },
  subCommands: { featured, analyze, scan, composite },
});
