import { defineCommand } from 'citty';
import { apiFetch, getConfig } from '../api-client.js';
import { printKeyValue } from '../formatters/table.js';
import { spinner, handleError } from '../formatters/common.js';

export default defineCommand({
  meta: { name: 'macro-regime', description: 'Market-wide macro regime classification across all horizons' },
  args: {
    days: { type: 'string', description: 'Days of history (default 1)' },
    horizon: { type: 'string', description: 'Filter to specific horizon (e.g. 7d, 30d)' },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner('Fetching macro regime…');
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const params: Record<string, string | undefined> = {
        days: args.days ?? '1',
        horizon: args.horizon,
      };
      const data = await apiFetch('/api/market-pulse/regime', params, cfg);
      s.succeed('Macro regime');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printKeyValue(data as Record<string, unknown>);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});
