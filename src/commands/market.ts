import { defineCommand } from 'citty';
import { apiFetch, getConfig } from '../api-client.js';
import { printTable } from '../formatters/table.js';
import { spinner, handleError } from '../formatters/common.js';

export default defineCommand({
  meta: { name: 'market', description: 'Market snapshot — all assets with composite scores and returns' },
  args: {
    assets: { type: 'string', description: 'Comma-separated symbols (e.g. BTC,ETH,SOL)' },
    mode: { type: 'string', description: 'snapshot or series' },
    days: { type: 'string', description: 'Days of history for series mode' },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner('Fetching market data…');
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const params: Record<string, string | undefined> = {
        assets: args.assets,
        mode: args.mode,
        days: args.days,
      };
      const data = await apiFetch('/api/assets', params, cfg);
      s.succeed('Market snapshot');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printTable(data);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});
