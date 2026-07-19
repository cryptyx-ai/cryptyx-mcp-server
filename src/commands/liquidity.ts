import { defineCommand } from 'citty';
import { apiFetch, getConfig } from '../api-client.js';
import { printTable } from '../formatters/table.js';
import { spinner, handleError } from '../formatters/common.js';

export default defineCommand({
  meta: { name: 'liquidity', description: 'Order book depth — bid/ask USD at 50/100/200bp from mid' },
  args: {
    asset: { type: 'positional', description: 'Asset symbol (e.g. BTC)', required: true },
    days: { type: 'string', description: 'Days of history (default 0 = latest)' },
    include: { type: 'string', description: 'Set to "futures" for derivatives OB depth' },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner(`Fetching liquidity for ${args.asset}…`);
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const params: Record<string, string | undefined> = {
        asset: args.asset,
        days: args.days,
        include: args.include,
      };
      const data = await apiFetch('/api/asset-liquidity', params, cfg);
      s.succeed(`Liquidity for ${args.asset}`);
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printTable(data);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});
