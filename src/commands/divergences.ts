import { defineCommand } from 'citty';
import { apiFetch, getConfig } from '../api-client.js';
import { printKeyValue } from '../formatters/table.js';
import { spinner, handleError } from '../formatters/common.js';

export default defineCommand({
  meta: { name: 'divergences', description: 'Cross-factor divergence alerts (distribution, capitulation, ignition)' },
  args: {
    horizons: { type: 'string', description: 'Comma-separated horizons (e.g. 7d,30d). Default: all' },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner('Detecting divergences…');
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const params: Record<string, string | undefined> = {
        horizons: args.horizons,
      };
      const data = await apiFetch('/api/market-pulse/divergences', params, cfg);
      s.succeed('Divergence alerts');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printKeyValue(data as Record<string, unknown>);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});
