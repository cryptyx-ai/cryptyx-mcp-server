import { defineCommand } from 'citty';
import { apiFetch, getConfig } from '../api-client.js';
import { printKeyValue } from '../formatters/table.js';
import { spinner, handleError } from '../formatters/common.js';

export default defineCommand({
  meta: { name: 'regime', description: 'Regime classification (trending, mean-reverting, volatile) for an asset' },
  args: {
    asset: { type: 'positional', description: 'Asset symbol (e.g. BTC)', required: true },
    mode: { type: 'string', description: 'snapshot or series' },
    days: { type: 'string', description: 'Days of history' },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner(`Fetching regime for ${args.asset}…`);
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const params: Record<string, string | undefined> = {
        asset: args.asset,
        mode: args.mode,
        days: args.days,
      };
      const data = await apiFetch('/api/asset-regimes', params, cfg);
      s.succeed(`Regime for ${args.asset}`);
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printKeyValue(data as Record<string, unknown>);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});
