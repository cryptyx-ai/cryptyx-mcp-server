import { defineCommand } from 'citty';
import { apiFetch, getConfig } from '../api-client.js';
import { printTable } from '../formatters/table.js';
import { spinner, handleError } from '../formatters/common.js';

export default defineCommand({
  meta: { name: 'prices', description: 'Latest spot prices for all tracked assets (15m refresh)' },
  args: {
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner('Fetching live prices…');
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const data = await apiFetch('/api/live-prices', undefined, cfg);
      s.succeed('Live prices');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printTable(data);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});
