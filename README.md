# @cryptyx/mcp-server

**CRYPTYX — Digital Asset Intelligence**

Institutional-grade quant intelligence for digital assets. Scan the market on hundreds of metrics, study every prior instance of a move, and build and backtest the strategies your agent runs.

This package is the CRYPTYX MCP server for clients that run local (stdio) servers: Claude Desktop, Claude Code, Cursor, agent frameworks and bots. It carries the same tools, descriptions and instructions as the CRYPTYX remote MCP, and every call runs on it, so answers are identical on both.

## Ways to connect

| Path | Best for | Auth |
|---|---|---|
| **This npm package** (stdio) | Clients that run local servers; agents and bots on a `cx_` API key | `CRYPTYX_API_KEY` |
| **Remote MCP** `https://mcp.cryptyx.ai/api/mcp` (Streamable HTTP) | Claude, Cursor or any client that supports remote servers. Nothing to install | OAuth 2.1, or `Authorization: Bearer cx_<your-key>` |
| **Agent plugin** https://github.com/cryptyx-ai/agents | Claude Code, Grok Build and other agent hosts; adds skills on top of the remote MCP | OAuth 2.1 or a `cx_` API key |

The same `cx_` API key works on all three. Create one at [cryptyx.ai/account](https://cryptyx.ai/account); API keys come with Pro plans. On a free account, connect through the remote MCP with OAuth instead.

---

## Install

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cryptyx": {
      "command": "npx",
      "args": ["-y", "@cryptyx/mcp-server"],
      "env": {
        "CRYPTYX_API_KEY": "cx_your_key"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add cryptyx --env CRYPTYX_API_KEY=cx_your_key -- npx -y @cryptyx/mcp-server
```

### Any other MCP client

Command `npx -y @cryptyx/mcp-server`, transport stdio, with `CRYPTYX_API_KEY` in the server's environment. Node.js 20 or later.

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `CRYPTYX_API_KEY` | Yes | none | Your `cx_` API key from [cryptyx.ai/account](https://cryptyx.ai/account). Also read from `~/.config/cryptyx/config.json` (set with `npx cryptyx config set-key`). |
| `CRYPTYX_API_URL` | No | `https://cryptyx.ai` | Base URL. The server calls `<CRYPTYX_API_URL>/api/mcp`. |

---

## Tools

<!-- BEGIN generated tools -->
| Tool | What it is |
|---|---|
| `get_cryptyx_overview` | CRYPTYX Overview |
| `get_coin_study` | Asset Study |
| `get_episode_study` | Episode Study |
| `check_coverage` | Check Asset Coverage |
| `get_data_liveness` | Data Freshness |
| `get_price_history` | Price History |
| `analyze_metric` | Analyze a Metric |
| `scan_metric_universe` | Scan Metric Universe |
| `get_live_prices` | Live Prices |
| `get_featured_metrics` | Featured Metrics |
| `analyze_metrics_composite` | Analyze Combined Metric Conditions |
<!-- END generated tools -->

Each tool's full description, input schema and the server instructions come from the remote MCP connector itself. If your plan does not include a tool, the call returns an upgrade message, which your agent relays.

Not sure where to start? Ask your agent what CRYPTYX can do: `get_cryptyx_overview` returns goal-based starting points with ready-to-use prompts.

## How it works

```
MCP client ──stdio──▶ @cryptyx/mcp-server ──HTTPS + cx_ key──▶ CRYPTYX remote MCP (/api/mcp)
```

- **initialize:** the server sends the remote connector's instructions (bundled with the package).
- **tools/list:** with an API key set, the live list from the remote connector; without one, or offline, the bundled list, which matches the remote at release time.
- **tools/call:** forwarded to the remote connector with your key. Results come back unchanged, including plain-English names for every metric and the attribution footer.

Every number is computed by the CRYPTYX engine from a live database. Historical statistics, not a forecast. Not investment advice.

## Upgrading from 0.11 or earlier

- Your config keeps working: same command, same `CRYPTYX_API_KEY`, same tool names for the tools that remain.
- Tools that earlier versions listed and the connector no longer carries return a short message asking you to refresh the tool list. Restart your MCP client and it picks up the current list.
- The startup notice on stderr is gone. Its opt-out variable is no longer needed and is ignored if still set.

Full details: [CHANGELOG.md](./CHANGELOG.md).

---

## CLI

The package also installs a terminal client for people and scripts, built on the same API key:

```bash
npx cryptyx config set-key cx_your_key
npx cryptyx --help
```

Every command supports `--json` for raw output, plus `--api-key` and `--api-url` overrides.

## Execution stays with you

CRYPTYX is venue-neutral and does not execute trades. You choose the venue; reference integrations: [cryptyx.ai/docs/integrations](https://cryptyx.ai/docs/integrations).

## Pay per call (x402)

Agents can also pay per call in USDC on Base, with no account or API key: [cryptyx.ai/docs/x402](https://cryptyx.ai/docs/x402).

## Links

- Homepage: [cryptyx.ai](https://cryptyx.ai)
- MCP documentation: [cryptyx.ai/docs/mcp](https://cryptyx.ai/docs/mcp)
- Current coverage and counts, from the engine: [cryptyx.ai/docs/at-a-glance](https://cryptyx.ai/docs/at-a-glance)
- Agent plugin: [github.com/cryptyx-ai/agents](https://github.com/cryptyx-ai/agents)
- Official MCP registry: [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/v0.1/servers?search=cryptyx)
- Changelog: [CHANGELOG.md](./CHANGELOG.md)

## License

MIT
