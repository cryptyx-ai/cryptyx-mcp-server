import { defineCommand } from 'citty';
import { apiFetch, getConfig } from '../api-client.js';
import { printTable } from '../formatters/table.js';
import { spinner, handleError } from '../formatters/common.js';

export default defineCommand({
  meta: { name: 'factors', description: 'Factor t-scores across 8 classes for an asset' },
  args: {
    asset: { type: 'positional', description: 'Asset symbol (e.g. BTC)', required: true },
    horizons: { type: 'string', description: 'Comma-separated horizons (e.g. 7d,30d)' },
    mode: { type: 'string', description: 'snapshot or series' },
    days: { type: 'string', description: 'Days of history for series mode' },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner(`Fetching factors for ${args.asset}…`);
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const params: Record<string, string | undefined> = {
        asset: args.asset,
        horizons: args.horizons,
        mode: args.mode,
        days: args.days,
      };
      const data = await apiFetch('/api/asset-factors', params, cfg);
      s.succeed(`Factors for ${args.asset}`);
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printTable(data);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});
