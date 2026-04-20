import { defineCommand } from 'citty';
import { apiFetch, getConfig } from '../api-client.js';
import { printTable } from '../formatters/table.js';
import { spinner, handleError } from '../formatters/common.js';

const rounds = defineCommand({
  meta: { name: 'rounds', description: 'List all competition rounds with rules and entry counts' },
  args: {
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  async run({ args }) {
    const s = spinner('Fetching rounds…');
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const data = await apiFetch('/api/competition/rounds', undefined, cfg);
      s.succeed('Competition rounds');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printTable(data);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});

export default defineCommand({
  meta: { name: 'competition', description: 'Competition leaderboard and rounds' },
  args: {
    'round-id': { type: 'string', description: 'Round ID (default: round_1)' },
    'sort-by': { type: 'string', description: 'Sort: composite_score, sharpe_ratio, total_return, max_drawdown' },
    json: { type: 'boolean', description: 'Raw JSON output' },
    'api-key': { type: 'string', description: 'Override API key' },
    'api-url': { type: 'string', description: 'Override base URL' },
  },
  subCommands: { rounds },
  async run({ args }) {
    const s = spinner('Fetching leaderboard…');
    try {
      const cfg = getConfig({ apiKey: args['api-key'], baseUrl: args['api-url'] });
      const params: Record<string, string | undefined> = {
        round_id: args['round-id'],
        sort_by: args['sort-by'],
      };
      const data = await apiFetch('/api/competition/leaderboard', params, cfg);
      s.succeed('Competition leaderboard');
      if (args.json) return console.log(JSON.stringify(data, null, 2));
      printTable(data);
    } catch (err) {
      s.fail('Failed');
      handleError(err);
    }
  },
});
