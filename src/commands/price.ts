import { defineCommand } from 'citty';
import { apiFetch, getConfig } from '../api-client.js';
import { printTable } from '../formatters/table.js';
import { spinner, handleError } from '../formatters/common.js';

export default defineCommand({
  meta: { name: 'price', description: 'Daily OHLCV candle data for a single asset' },
  args: {
    asset: { type: 'positional', description: 'Asset symbol (e.g. BTC)', required: true },
    days: { type: 'string', description: 'Days of history (default 90)' },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner(`Fetching price history for ${args.asset}…`);
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const params: Record<string, string | undefined> = {
        asset: args.asset,
        days: args.days,
      };
      const data = await apiFetch('/api/market-history', params, cfg);
      s.succeed(`Price history for ${args.asset}`);
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printTable(data);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});
