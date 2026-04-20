import { defineCommand } from 'citty';
import { apiFetch, getConfig } from '../api-client.js';
import { printTable } from '../formatters/table.js';
import { spinner, handleError } from '../formatters/common.js';

export default defineCommand({
  meta: { name: 'pulse', description: 'Factor breadth and regime analysis across the universe' },
  args: {
    days: { type: 'string', description: 'Days of history' },
    horizons: { type: 'string', description: 'Comma-separated horizons (e.g. 7d,30d)' },
    classes: { type: 'string', description: 'Comma-separated factor classes (e.g. TR,VOL)' },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner('Fetching market pulse…');
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const params: Record<string, string | undefined> = {
        days: args.days,
        horizons: args.horizons,
        classes: args.classes,
      };
      const data = await apiFetch('/api/market-pulse', params, cfg);
      s.succeed('Market pulse');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printTable(data);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});
