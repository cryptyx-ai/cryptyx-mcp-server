#!/usr/bin/env node
/**
 * CRYPTYX MCP Server (stdio transport)
 * Exposes crypto intelligence tools for AI agents via the Model Context Protocol.
 * All tools proxy to the CRYPTYX REST API — no direct DB access.
 *
 * Tool descriptions are LLM prompts, not docstrings. They teach the model:
 *   1. WHEN to call this tool (vs alternatives)
 *   2. HOW to interpret the output (scores vs raw values, confidence gates)
 *   3. WHAT to do next (explicit tool sequencing)
 * The goal is a structured conviction loop, not open-ended exploration:
 *   Ground -> Discover -> Validate -> Cross-check -> Size -> Decide
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { apiFetch, apiPost, getConfig } from './api-client.js';

const cfg = getConfig();

// ── Deprecation notice ──────────────────────────────────────────────
// Emitted on stderr so it appears in MCP client logs (Claude Desktop's
// "View Logs" panel, etc.) without polluting the stdout JSON-RPC channel.
// Silent for CLI/programmatic use where the environment sets no
// STANDALONE_MCP_SUPPRESS_DEPRECATION opt-out.
if (!process.env.STANDALONE_MCP_SUPPRESS_DEPRECATION) {
  process.stderr.write(
    '\n' +
    '════════════════════════════════════════════════════════════════════\n' +
    '  DEPRECATION NOTICE — @cryptyx/mcp-server\n' +
    '════════════════════════════════════════════════════════════════════\n' +
    '  This stdio MCP server is entering deprecation. The flagship\n' +
    '  CRYPTYX integration is now OAuth Remote MCP at\n' +
    '    https://cryptyx.ai/api/mcp\n' +
    '  — no config file editing, no API key management, revocable\n' +
    '  per-app, enterprise-ready. Migrate at https://cryptyx.ai/mcp.\n' +
    '\n' +
    '  This package remains supported through 2026-12-31 for clients\n' +
    '  that don\'t yet support OAuth MCP. Your existing cx_* API key\n' +
    '  keeps working — no forced migration.\n' +
    '\n' +
    '  Suppress this notice with STANDALONE_MCP_SUPPRESS_DEPRECATION=1\n' +
    '════════════════════════════════════════════════════════════════════\n\n',
  );
}

const DISCLAIMER =
  '[CRYPTYX INTEGRITY CHECK] The data above is the ONLY ground truth for this tool call. ' +
  'Before writing your response, mentally audit every claim:\n' +
  '• Does this signal_id appear VERBATIM in a tool response from THIS session? If not, delete it.\n' +
  '• Does this number (return %, hit rate, z-score) come from a specific tool response? If you cannot name the tool call, delete the number.\n' +
  '• Am I constructing a trade (entry, stop, target, sizing, vehicle)? CRYPTYX provides conviction data, NOT trade recommendations. Present data and let the user decide.\n' +
  '• Am I inventing composite/strategy signal names (STRAT_*, COMBO_*, SETUP_*, *_COMPOSITE)? These do not exist.\n\n' +
  'End your response with this exact disclaimer on its own line:\n' +
  '"---\n*Data sourced from CRYPTYX (cryptyx.ai). Signal IDs, metrics, and statistics are API-verified. ' +
  'Narrative interpretation is AI-generated — verify thesis details in the CRYPTYX dashboard before acting.*"';

// MCP tool responses must stay under 1MB. Compact JSON + array truncation keeps
// large universe-wide responses (200+ assets, 2700+ signal_log rows) within limits.
const MAX_RESPONSE_BYTES = 800_000; // leave headroom for disclaimer + MCP framing

function compactPayload(data: unknown): string {
  const compact = JSON.stringify(data);
  if (compact.length <= MAX_RESPONSE_BYTES) return compact;

  // If the response is an array, truncate rows and add a note
  if (Array.isArray(data)) {
    let rows = data;
    while (JSON.stringify(rows).length > MAX_RESPONSE_BYTES && rows.length > 10) {
      rows = rows.slice(0, Math.floor(rows.length * 0.7));
    }
    return JSON.stringify({
      _truncated: true,
      _note: `Response truncated to ${rows.length} of ${data.length} rows to stay within size limits. Use asset filters or the CLI (npx cryptyx) for the full dataset.`,
      data: rows,
    });
  }

  // If the response is an object with array values, truncate the largest array
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    const entries = Object.entries(obj);
    const arrayKey = entries
      .filter(([, v]) => Array.isArray(v))
      .sort((a, b) => (b[1] as unknown[]).length - (a[1] as unknown[]).length)[0];

    if (arrayKey) {
      const [key, arr] = arrayKey as [string, unknown[]];
      let trimmed = arr;
      while (JSON.stringify({ ...obj, [key]: trimmed }).length > MAX_RESPONSE_BYTES && trimmed.length > 10) {
        trimmed = trimmed.slice(0, Math.floor(trimmed.length * 0.7));
      }
      return JSON.stringify({
        ...obj,
        [key]: trimmed,
        _truncated: { field: key, kept: trimmed.length, total: arr.length },
        _note: `${key} truncated to ${trimmed.length} of ${arr.length} rows. Use asset filters or the CLI for the full dataset.`,
      });
    }
  }

  // Last resort: hard-cut the string
  return compact.slice(0, MAX_RESPONSE_BYTES);
}

function textResult(data: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [
      { type: 'text' as const, text: compactPayload(data) },
      { type: 'text' as const, text: DISCLAIMER },
    ],
  };
}

// Bind API helpers to resolved config for use in tool handlers
const get = (path: string, params?: Record<string, string>) => apiFetch(path, params, cfg);
const post = (path: string, body: unknown) => apiPost(path, body, cfg);

const INSTRUCTIONS =
  'CRYPTYX is a crypto intelligence DATA PLATFORM. It returns deterministic, API-verified data from a live database. ' +
  'The API cannot hallucinate — but YOU (the LLM) can and will unless you follow these rules strictly.\n\n' +
  'HARD RULES — violating any of these produces dangerous misinformation for users making financial decisions:\n\n' +
  '1. ONLY reference signal_ids and metric_ids that appear VERBATIM in a CRYPTYX tool response from THIS session. ' +
  'If you cannot point to the exact tool response that contained an ID, do not mention it. There are NO signals with ' +
  'STRAT_, COMBO_, SETUP_, or any other prefix you might infer — if you did not see it in an API response, it does not exist.\n\n' +
  '2. NEVER fabricate statistics. Every number you present (return %, hit rate, z-score, confidence, sample size) must come ' +
  'from a specific tool response. If you cannot name which tool call returned a number, delete it from your response. ' +
  '"The data shows" is only valid if you can cite which data from which call.\n\n' +
  '3. NEVER construct trade recommendations. CRYPTYX provides conviction data (scores, signals, factor readings, backtests). ' +
  'It does NOT provide and you must NOT generate: entry/exit prices, stop-loss levels, position sizing, vehicle selection ' +
  '(perp vs spot vs options), portfolio construction, or hedging strategies. Present the data. Let the user make the trade decision.\n\n' +
  '4. NEVER present narrative interpretation as data-backed conclusion. Phrases like "the data confirms", "signals validate", ' +
  'or "backtested edge supports" are only valid if you ran the specific backtest/signal tool and are quoting its output. ' +
  'Your synthesis of multiple data points is INTERPRETATION, not verification — label it as such.\n\n' +
  '5. When a signal or metric has a poor health grade (C/D/F/U), is anti-predictive, or has insufficient sample size (<30), ' +
  'you MUST flag this prominently. Do not bury caveats in footnotes or present unreliable data alongside reliable data without distinction.\n\n' +
  '6. CRYPTYX covers ~200 digital assets across 8 factor classes with 143+ active signals (across 5 geometry types: single_metric, state_transition, cross_timeframe, multi_factor, regime_conditional), 9 IC-weighted composites, and 440+ metrics with per-asset time-series grading. Do not claim ' +
  'broader coverage than this. OPT-class signals cover only BTC/ETH (Deribit scope).\n\n' +
  'The user is likely making financial decisions based on your output. Precision and honesty about what the data does and ' +
  'does not show is more valuable than a compelling narrative.';

const server = new McpServer(
  { name: 'cryptyx', version: '0.5.0' },
  { instructions: INSTRUCTIONS },
);

// ─── Tool 1: Market Snapshot ─────────────────────────────────────────

server.tool(
  'get_market_snapshot',
  'Full universe view: all ~200 assets ranked by CRYPTYX composite score (normalized cross-sectional, NOT raw price). ' +
    'Returns per-asset composite score, rank, and recent returns. Call AFTER `get_composite_rankings` when you need the ' +
    'complete universe rather than just top/bottom slices — e.g. filtering for mid-ranked assets or comparing two specific assets.',
  {
    assets: z.string().optional().describe('Comma-separated asset symbols (e.g. BTC,ETH,SOL). Omit for all.'),
    mode: z.enum(['snapshot', 'series']).optional().describe('snapshot (latest) or series (time series)'),
    days: z.number().int().min(1).max(365).optional().describe('Days of history for series mode (default 30)'),
  },
  async ({ assets, mode, days }) => {
    const params: Record<string, string> = {};
    if (assets) params.assets = assets;
    if (mode) params.mode = mode;
    if (days) params.days = String(days);
    const data = await get('/api/assets', params);
    return textResult(data);
  },
);

// ─── Tool 2: Signal Triggers ─────────────────────────────────────────

server.tool(
  'get_signal_triggers',
  "Today's fired signals across all assets — the system's live conviction events. Output: atomic signals + composite " +
    'rollups with normalized confidence (0-1, NOT a probability of price movement). Only returns what fired today, not ' +
    'universe state. Call AFTER `get_composite_rankings` for context. A signal firing is necessary but not sufficient for a ' +
    'trade thesis — always cross-check with `get_regime_analysis` (regime must align with thesis direction) and ' +
    '`backtest_signal` (reliability_grade must be green) before citing a trigger as actionable. HALLUCINATION GUARD: you ' +
    'may ONLY reference signal_ids that appear verbatim in a CRYPTYX tool response from this session. There are NO signals ' +
    'with a STRAT_ prefix, no composite strategy IDs, and no signal names you can infer — if you did not see it in an API ' +
    'response, it does not exist.',
  {},
  async () => {
    const data = await get('/api/signals/active');
    return textResult(data);
  },
);

// ─── Tool 3: Signal Catalog ──────────────────────────────────────────

server.tool(
  'get_signal_catalog',
  'Full discovery surface: all production signals with active parameters + 30d triggering stats. PREFER ' +
    '`get_top_signals` for curated picks — it returns only A/B-graded signals with proven predictive power and is the ' +
    'right default. Use this catalog only when you need the complete set for breadth discovery or to find a specific ' +
    "signal_id for backtesting. Key fields: `trigger_rate_per_asset_day` (0-1) is the rarity metric — >=0.5 means the " +
    'signal fires constantly and is unlikely alpha. OPT-class signals cover ~2 assets (BTC/ETH) by design — low breadth ' +
    "is expected, not a flaw. `logic_sql` is never exposed (protected IP).",
  {},
  async () => {
    const data = await get('/api/signals/catalog');
    return textResult(data);
  },
);

// ─── Tool 4: Top Signals ────────────────────────────────────────────

server.tool(
  'get_top_signals',
  "Curated top 10 signals ranked by 7d information coefficient (IC). Pre-filtered to A/B health grade, proven predictive " +
    "power, and n_obs >= 30 — safe to cite as the platform's strongest signals without further vetting. Each entry " +
    "includes ic_7d, hit_rate_7d, n_obs_7d, health_grade, trigger_rate_per_asset_day, active_params. This is the right " +
    "call for 'what should I watch?' or 'which signals are strongest?' questions. For any specific signal, always " +
    '`backtest_signal` before recommending action — IC alone does not guarantee forward performance. Use `get_signal_catalog` ' +
    'only if you need the complete set beyond this curated list. HALLUCINATION GUARD: every signal_id you reference MUST ' +
    'appear verbatim in a CRYPTYX tool response. Do not synthesize composite names like STRAT_*, COMBO_*, or SETUP_* — ' +
    'these do not exist in the platform.',
  {},
  async () => {
    const data = await get('/api/signals/top');
    return textResult(data);
  },
);

// ─── Tool 5: Factor Scores ──────────────────────────────────────────

server.tool(
  'get_factor_scores',
  'Factor t-scores for an asset across 8 factor classes (CORR, EFF, FLOW, FUT, OB, OPT, TR, VOL) and multiple horizons. ' +
    'CRITICAL: t-scores are percentile-ranked cross-sectional composites (typically bounded ~+/-3) — NOT raw metric values ' +
    'like funding rates or prices. A t-score of +2.5 means the asset sits in the top ~1% of the universe for that ' +
    'factor/horizon — use for relative strength, not absolute levels. Call AFTER `get_composite_rankings` to drill into a ' +
    'specific asset. When presenting a factor snapshot, you MUST include ALL 8 classes in your table: CORR, EFF, FLOW, FUT, ' +
    'OB, OPT, TR, VOL — every single one, even if neutral. Omitting a class hides information the user needs to see. ' +
    'A "neutral" reading is data, not absence of data. Use to cross-check a thesis: if your thesis is bullish but TR and ' +
    'FLOW factors are deeply negative, that is a contradiction worth surfacing.',
  {
    asset: z.string().describe('Asset symbol (e.g. BTC, ETH)'),
    mode: z.enum(['snapshot', 'series']).optional().describe('snapshot (latest) or series'),
    days: z.number().int().min(1).max(365).optional().describe('Days of history (default 90)'),
    horizons: z.string().optional().describe('Comma-separated horizons (e.g. 7d,30d). Valid: 1d,7d,14d,30d,60d,90d,180d,365d'),
  },
  async ({ asset, mode, days, horizons }) => {
    const params: Record<string, string> = { asset };
    if (mode) params.mode = mode;
    if (days) params.days = String(days);
    if (horizons) params.horizons = horizons;
    const data = await get('/api/asset-factors', params);
    return textResult(data);
  },
);

// ─── Tool 6: Composite Rankings ──────────────────────────────────────

server.tool(
  'get_composite_rankings',
  'ALWAYS CALL FIRST. Single grounding call returning factor breadth, top/bottom composite rankings, signal trigger ' +
    'summary, and pipeline status. This is your conviction playbook entry point — use the response to decide your next move:\n\n' +
    "* Building a thesis? -> Pick assets from top/bottom rankings -> `get_factor_scores` + `get_regime_analysis` -> " +
    '`get_top_signals` or `get_signal_triggers` -> `backtest_signal` to validate -> `get_asset_liquidity` to size.\n' +
    "* Scanning for opportunities? -> Check signal trigger summary -> `get_top_signals` for curated picks -> " +
    '`analyze_metric` or `analyze_metrics_composite` to backtest the edge.\n' +
    "* Looking for alpha? -> `get_featured_metrics` shows the highest-IC metrics right now. Use " +
    '`analyze_metrics_composite` to test multi-factor theses like: capitulation reversal (VOL spike + selling pressure + ' +
    "funding stress), efficiency breakout (high price efficiency + trend acceleration), or stealth accumulation (net " +
    "buying + suppressed volatility). These multi-factor intersections are where the platform's deepest alpha lives.\n" +
    '* Answering "what should I trade?" -> Follow the conviction loop: Ground (this tool) -> Discover (signals/metrics) ' +
    '-> Validate (backtest) -> Cross-check (regime + factors) -> Size (liquidity). Only recommend action when backtest ' +
    'reliability_grade is green AND regime aligns with thesis direction.\n\n' +
    'ASSET MODE: pass `asset` (e.g. BTC) to get per-asset context — includes top metrics ranked by time-series IC ' +
    '(predictive power for that specific asset) with both TS and CS grades. Without asset, grades reflect cross-sectional ' +
    'IC (ranking power across the full universe).\n\n' +
    'Do NOT fan out to 5+ tools before reading this response — it usually answers the question or narrows the search to ' +
    '1-2 follow-up calls.',
  {
    asset: z.string().optional().describe('Asset symbol (e.g. BTC). When provided, includes per-asset metrics ranked by time-series IC.'),
  },
  async ({ asset }) => {
    const params: Record<string, string> = {};
    if (asset) params.asset = asset;
    const data = await get('/api/v1/agent-context', params);
    return textResult(data);
  },
);

// ─── Tool 7: Market Pulse ────────────────────────────────────────────

server.tool(
  'get_market_pulse',
  'Factor breadth across the universe — how many assets sit in positive/negative/neutral territory per factor class. ' +
    'Output is counts and percentages (cross-sectional, normalized), NOT raw factor values. Use for macro context: if ' +
    '80% of assets have negative FLOW scores, that is a universe-wide risk-off signal. Call AFTER grounding when the user ' +
    'asks about market-wide conditions rather than a single asset.',
  {
    days: z.number().int().min(1).max(365).optional().describe('Days of history (default 30)'),
    horizons: z.string().optional().describe('Comma-separated horizons (e.g. 7d,30d)'),
    classes: z.string().optional().describe('Comma-separated factor classes (e.g. TR,VOL)'),
  },
  async ({ days, horizons, classes }) => {
    const params: Record<string, string> = {};
    if (days) params.days = String(days);
    if (horizons) params.horizons = horizons;
    if (classes) params.classes = classes;
    const data = await get('/api/market-pulse', params);
    return textResult(data);
  },
);

// ─── Tool 8: Price History ───────────────────────────────────────────

server.tool(
  'get_price_history',
  'Daily OHLCV candles for a single asset — RAW USD prices and volume, not normalized scores. Use when the user asks ' +
    'about price levels, recent performance, or needs a chart. Pair with `get_factor_scores` to understand whether recent ' +
    'moves are extreme relative to the universe (price tells you what happened, factors tell you whether it matters).',
  {
    asset: z.string().describe('Asset symbol (e.g. BTC)'),
    days: z.number().int().min(1).max(365).optional().describe('Days of history (default 90)'),
  },
  async ({ asset, days }) => {
    const params: Record<string, string> = { asset };
    if (days) params.days = String(days);
    const data = await get('/api/market-history', params);
    return textResult(data);
  },
);

// ─── Tool 9: Signal Explanation ──────────────────────────────────────

server.tool(
  'get_signal_explanation',
  'Structured breakdown of why a signal fired (or did not fire) for a specific asset on a specific day. Returns the ' +
    'factor scores and composite context that drove the decision. Use when the user asks "why did X signal fire on Y?" or ' +
    'when you need to explain a trigger from `get_signal_triggers`. Useful for building intuition about signal behavior ' +
    'before backtesting.',
  {
    signal_id: z.string().describe('Signal ID (e.g. VOL_SPIKE, CORR_BREAKDOWN)'),
    day: z.string().describe('Date in YYYY-MM-DD format'),
    asset: z.string().describe('Asset symbol (e.g. BTC)'),
  },
  async ({ signal_id, day, asset }) => {
    const data = await get('/api/signals/explain', { signal_id, day, asset });
    return textResult(data);
  },
);

// ─── Tool 10: Search Assets ──────────────────────────────────────────

server.tool(
  'search_assets',
  'List all ~200 tracked assets in the CRYPTYX universe with their universe tags (major, defi, layer1, meme, etc.). ' +
    'Use when the user names a token and you need to confirm it is in the CRYPTYX universe before calling other tools.',
  {},
  async () => {
    const data = await get('/api/token-universe');
    return textResult(data);
  },
);

// ─── Tool 11: Regime Analysis ────────────────────────────────────────

server.tool(
  'get_regime_analysis',
  'Per-asset 9-regime classification (Risk-On Momentum, Risk-Off Defensive, Broad Expansion, Accumulation, ' +
    'Deleveraging, Volatility Regime, Choppy, Divergent, Transitional) with confidence scores, factor breakdowns, ' +
    'cross-class alignment, and asset-vs-market divergence. Also includes per-asset divergence alerts (ignition, ' +
    'capitulation, distribution). CRITICAL GATE: regime must align with thesis direction before recommending action. ' +
    'Check asset_vs_market field to see if the asset diverges from the broader market regime.',
  {
    asset: z.string().describe('Asset symbol (e.g. BTC)'),
    horizon: z.string().optional().describe('Single horizon to filter (e.g. 30d). Omit for all 8 horizons.'),
  },
  async ({ asset, horizon }) => {
    const params: Record<string, string> = { symbol: asset };
    if (horizon) params.horizon = horizon;
    const data = await get('/api/asset/regime', params);
    return textResult(data);
  },
);

// ─── Tool 12: Backtest Signal ───────────────────────────────────────

server.tool(
  'backtest_signal',
  'VALIDATION STEP — run before recommending any signal-based trade. Backtests a signal over a date range with ' +
    'per-horizon (1d/7d/14d/30d) mean return, hit rate, bootstrap 95% CI, and statistical significance.\n\n' +
    'MANDATORY: read these fields before quoting ANY stat:\n' +
    '* `performance.reliability_grade` — green/yellow/red. If red, do NOT present results as alpha.\n' +
    '* `performance.is_sample_sufficient` — needs >=30 trigger events. Below 30 = unreliable.\n' +
    "* `horizon.is_reliable` — per-horizon gate. If false, do NOT cite that horizon's mean_return or hit_rate.\n" +
    "* `statistical_significance` — 'insufficient_sample' means NO signal detected, not a weak one.\n" +
    '* `caveats` array — surface these in your answer (span warnings, IS-only caveat).\n\n' +
    'Always quote sample_size alongside any return stat. A 100% hit rate on 3 events is noise, not alpha. Use at least ' +
    '180 days (ideally 365) for the date range to capture multiple regimes.',
  {
    signal_id: z.string().describe('Signal ID (e.g. VOL_SPIKE, TR_PRICE_MOM_Z)'),
    from: z.string().describe('Start date YYYY-MM-DD'),
    to: z.string().describe('End date YYYY-MM-DD'),
    dryrun: z.boolean().optional().describe('If true, evaluate without writing to signal_log (default false)'),
  },
  async ({ signal_id, from, to, dryrun }) => {
    const data = await post('/api/signals/backtest', { signal_id, from, to, dryrun });
    return textResult(data);
  },
);

// ─── Tool 13: Analyze Metric ───────────────────────────────────────

server.tool(
  'analyze_metric',
  'Single-metric z-score event-study backtest: "when this metric crossed threshold X historically, what happened to the ' +
    'price?" Returns sample count, hit rate, and mean/median forward returns across 8 horizons (1d-365d). NOT a ' +
    'current-state read — this analyzes historical events. Core factor-discovery tool for building a thesis. Pair with ' +
    '`get_featured_metrics` to find which metrics have the strongest predictive power, then drill into specific assets with ' +
    'this tool.',
  {
    metric_id: z.string().describe('Metric ID (e.g. TR_ADX_14D, VOL_GARCH_7D)'),
    asset: z.string().describe('Asset symbol (e.g. BTC)'),
    operator: z.enum(['gt', 'lt', 'gte', 'lte', 'abs_gt']).describe('Z-score comparison operator'),
    threshold: z.number().describe('Z-score threshold value'),
  },
  async ({ metric_id, asset, operator, threshold }) => {
    const data = await post('/api/metrics/slicer', { metric_id, asset, operator, threshold });
    return textResult(data);
  },
);

// ─── Tool 14: Scan Metric Universe ─────────────────────────────────

server.tool(
  'scan_metric_universe',
  'Scan a metric across all ~200 assets for z-score extremes TODAY. Returns which assets currently sit at extreme ' +
    'z-scores relative to their own history, with forward return context at 1d/7d/30d. Use to find outliers — e.g. ' +
    "'which assets have the most extreme funding rate right now?'\n\n" +
    'Each result row includes per-asset time-series grading: `ts_grade` (A-F/U, how well this metric predicts returns ' +
    'for THIS specific asset) and `ts_ic` (time-series information coefficient). Cross-sectional health is in the ' +
    '`health` object. When ts_grade and health.grade diverge, surface the conflict — a metric may be A-grade for the ' +
    'universe but D-grade for a specific asset, or vice versa.\n\n' +
    'MANDATORY: read `health` before citing any predictive claim:\n' +
    '* `health.grade` — cross-sectional grade: A/B reliable, C marginal, D/F/U unreliable.\n' +
    '* `health.is_anti_predictive` — if true, the metric historically predicts the OPPOSITE of what you would expect.\n' +
    '* `health.sample_sufficient` — needs n_obs_7d >= 30 to be reliable.\n' +
    "If health is poor, say 'this metric shows X at extreme levels, but the metric has limited predictive reliability' — " +
    'do NOT present it as alpha.',
  {
    metric_id: z.string().describe('Metric ID to scan'),
    operator: z.enum(['gt', 'lt', 'gte', 'lte', 'abs_gt']).describe('Z-score comparison operator'),
    threshold: z.number().describe('Z-score threshold value'),
  },
  async ({ metric_id, operator, threshold }) => {
    const data = await get('/api/metrics/slicer/scan', {
      metric_id,
      operator,
      threshold: String(threshold),
    });
    return textResult(data);
  },
);

// ─── Tool 15: Get Asset Liquidity ──────────────────────────────────

server.tool(
  'get_asset_liquidity',
  'Order book depth for an asset — bid/ask depth at 50/100/200bp from mid. Output is RAW USD values (e.g. $2.4M ' +
    'bid-side depth at 100bp), not normalized scores. SIZING STEP: call this before recommending position sizes or ' +
    'assessing execution feasibility. Thin liquidity (<$500k at 100bp) means large orders will suffer material slippage — ' +
    'flag this explicitly. Include `include: "futures"` for derivatives context.',
  {
    asset: z.string().describe('Asset symbol (e.g. BTC)'),
    days: z.number().int().min(0).max(365).optional().describe('Days of history (default 0 = latest only)'),
    include: z.string().optional().describe('Set to "futures" to include futures OB depth'),
  },
  async ({ asset, days, include }) => {
    const params: Record<string, string> = { asset };
    if (days !== undefined) params.days = String(days);
    if (include) params.include = include;
    const data = await get('/api/asset-liquidity', params);
    return textResult(data);
  },
);

// ─── Tool 16: Get Live Prices ──────────────────────────────────────

server.tool(
  'get_live_prices',
  'Latest spot prices for all tracked assets (refreshed every 15 minutes). RAW USD prices, not normalized scores. ' +
    'Use when the user asks "what is X trading at?" or needs current price context for sizing/entry-level discussion.',
  {},
  async () => {
    const data = await get('/api/live-prices');
    return textResult(data);
  },
);

// ─── Tool 17: Get Featured Metrics ─────────────────────────────────

server.tool(
  'get_featured_metrics',
  "ALPHA DISCOVERY — the platform's strongest metrics by information coefficient (IC). Returns the 8 highest-conviction " +
    "A/B-grade metrics plus the single best metric by composite IC*hit_rate score — pre-filtered for proven predictive " +
    "power, safe to cite as 'top metrics' without further vetting. Each entry includes `n_obs_7d` — always check sample " +
    'size >=30 before quoting IC or hit_rate as predictive.\n\n' +
    'TWO MODES:\n' +
    '• Without `asset`: returns cross-sectional (CS) top metrics — ranked by how well the metric predicts returns across ' +
    'the full universe of ~200 assets. Good for "what factors matter market-wide?"\n' +
    '• With `asset` (e.g. BTC): returns per-asset time-series (TS) top metrics — ranked by how well the metric predicts ' +
    'returns for THAT SPECIFIC asset historically. Response includes both `ts_grade` and `cs_grade` so you can see where ' +
    'they diverge. Good for "what drives BTC specifically?" Use this mode when building a thesis for a single asset.\n\n' +
    'The recommended workflow: (1) call this tool to see which metrics have the strongest edges right now, ' +
    '(2) `scan_metric_universe` on a top metric to find which assets are at extremes today, ' +
    '(3) `analyze_metric` on a specific asset to see what happened historically when this metric hit extreme levels, ' +
    '(4) `analyze_metrics_composite` to combine 2-3 top metrics into a multi-factor thesis with higher conviction. This ' +
    'workflow produces the kind of backtested, multi-factor conviction that institutional desks build around.',
  {
    asset: z.string().optional().describe('Asset symbol (e.g. BTC). When provided, ranks by per-asset time-series IC instead of cross-sectional IC.'),
  },
  async ({ asset }) => {
    const params: Record<string, string> = {};
    if (asset) params.asset = asset;
    const data = await get('/api/metrics/slicer/featured', params);
    return textResult(data);
  },
);

// ─── Tool 18: Get Asset Top Predictors ────────────────────────────

server.tool(
  'get_asset_top_predictors',
  'PER-ASSET PREDICTIVE POWER — returns the metrics with the highest time-series IC for a specific asset, ranked by ' +
    'per-asset predictive power (not cross-sectional ranking power). Each entry includes both TS grade (asset-specific) ' +
    'and CS grade (cross-asset) so you can see divergences. A metric with CS Grade F but TS Grade A is a hidden alpha ' +
    'source for that asset. Use this when building single-asset conviction or evaluating which metrics matter most for ' +
    'a specific token.',
  {
    symbol: z.string().describe('Asset symbol (e.g. BTC, ETH, SOL). Required.'),
    horizon: z.enum(['7d', '14d', '30d']).optional().describe('Analysis horizon (default 14d)'),
  },
  async ({ symbol, horizon }) => {
    const params: Record<string, string> = { symbol };
    if (horizon) params.horizon = horizon;
    const data = await get('/api/asset/top-predictors', params);
    return textResult(data);
  },
);

// ─── Tool 19: Fork Signal ──────────────────────────────────────────

server.tool(
  'fork_signal',
  'EXPERIMENTATION TOOL — create a new parameter variant of an existing signal without affecting the live version. The ' +
    'fork can be backtested via `backtest_signal` to compare against the original. Use when a signal shows promise but the ' +
    'threshold seems too tight or too loose. Requires admin approval to promote to production.',
  {
    signal_id: z.string().describe('Signal ID to fork (e.g. VOL_SPIKE)'),
    params: z.record(z.unknown()).describe('New parameter values as key-value pairs (e.g. { "z_threshold": 2.5 })'),
  },
  async ({ signal_id, params }) => {
    const data = await post('/api/signals/fork', { signal_id, params });
    return textResult(data);
  },
);

// ─── Tool 19: Simulate Signal Threshold ────────────────────────────

server.tool(
  'simulate_signal',
  'What-if analysis: estimate what the trigger rate would be if a signal threshold were changed, without actually ' +
    'changing anything. Use before `fork_signal` to sanity-check — if the proposed threshold would make the signal fire ' +
    'on 80% of asset-days, it has no discriminatory power.',
  {
    signal_id: z.string().describe('Signal ID (e.g. VOL_SPIKE)'),
    threshold_key: z.string().describe('Parameter key to simulate (e.g. z_threshold)'),
    threshold_value: z.number().describe('Proposed threshold value'),
    asof_day: z.string().optional().describe('Date to simulate on (YYYY-MM-DD, default latest)'),
  },
  async ({ signal_id, threshold_key, threshold_value, asof_day }) => {
    const body: Record<string, unknown> = { signal_id, threshold_key, threshold_value };
    if (asof_day) body.asof_day = asof_day;
    const data = await post('/api/signals/simulate', body);
    return textResult(data);
  },
);

// ─── Tool 20: Analyze Metrics Composite ────────────────────────────

server.tool(
  'analyze_metrics_composite',
  "HIGHEST-CONVICTION TOOL — multi-factor thesis builder. Define 2-4 metric conditions and see when ALL fired " +
    "simultaneously in history, with forward returns across 8 horizons. This is the platform's deepest alpha: single " +
    'metrics can be noise, but when 2-3 independent factors align, the edge is structurally stronger.\n\n' +
    'Example thesis patterns (proven in backtesting):\n' +
    '* Capitulation reversal: VOL_RV_7D z > 2.0 + FLOW_TAKER_BS_RATIO z < -1.5 + FUT_FUNDING_MA_7D z < -1.0 (vol spike + selling + funding stress)\n' +
    '* Efficiency breakout: EFF_ER_14D z > 1.5 + TR_MA_DIST_60D z > 1.0 (efficient pricing + trend confirmation)\n' +
    '* Stealth accumulation: FLOW_TAKER_NET_USD z > 1.0 + VOL_RV_30D z < -1.0 (net buying into suppressed volatility)\n\n' +
    'IMPORTANT: always use `get_featured_metrics` or `get_signal_catalog` to discover actual metric_ids — do NOT guess ' +
    'metric names. Use `get_featured_metrics` to pick conditions based on today\'s strongest metrics, then this tool to ' +
    'test the intersection on a specific asset.',
  {
    asset: z.string().describe('Asset symbol (e.g. BTC)'),
    conditions: z.array(z.object({
      metric_id: z.string().describe('Metric ID'),
      operator: z.enum(['gt', 'lt', 'gte', 'lte', 'abs_gt']).describe('Operator'),
      threshold: z.number().describe('Z-score threshold'),
    })).min(2).max(4).describe('Array of 2-4 metric conditions'),
  },
  async ({ asset, conditions }) => {
    const data = await post('/api/metrics/slicer/composite', { asset, conditions });
    return textResult(data);
  },
);

// ─── Tool 21: Macro Regime ─────────────────────────────────────────

server.tool(
  'get_macro_regime',
  'Market-wide regime classification across all horizons (1d-365d). Returns the dominant regime label (Broad Expansion, ' +
    'Risk-On Momentum, Risk-Off, Deleveraging, Accumulation, Choppy, Divergent, High Volatility, Transitional), confidence ' +
    'score, per-class breadth breakdown, and horizon alignment state per factor class. This is the MACRO view — not per-asset. ' +
    'Use `get_regime_analysis` for per-asset regime; use this for "what regime is the market in?" Use the breadth and alignment ' +
    'data to assess whether the regime label has structural support or is marginal.\n\n' +
    'Includes temporal layers: tactical (7d/14d), strategic (30d/60d), and secular (180d/365d) regimes. When tactical and ' +
    'strategic disagree, a regime transition may be underway.',
  {
    days: z.number().int().min(1).max(365).optional().describe('Days of history (default 1 = current only)'),
    horizon: z.enum(['1d', '7d', '14d', '30d', '60d', '90d', '180d', '365d']).optional()
      .describe('Filter to specific horizon. Omit for all horizons.'),
  },
  async ({ days, horizon }) => {
    const params: Record<string, string> = {};
    if (days) params.days = String(days);
    if (horizon) params.horizon = horizon;
    const data = await get('/api/market-pulse/regime', params);
    return textResult(data);
  },
);

// ─── Tool 22: Divergence Alerts ───────────────────────────────────

server.tool(
  'get_divergences',
  'Cross-factor divergence pattern detection across the universe. Identifies three structural patterns from factor ' +
    'class interactions:\n\n' +
    '• **Distribution** (bearish) — net outflows while trend holds. Late-cycle exit signal, often precedes weakness.\n' +
    '• **Capitulation** (bullish) — flow + trend both extreme negative. Forced selling / panic, historically marks bounce zones.\n' +
    '• **Ignition** (bullish) — trend + volatility both extreme positive. Momentum breakout, strong continuation bias.\n\n' +
    'Each alert includes severity (higher = more extreme), the two factor classes involved, their scores, and an ' +
    'interpretation. Alerts are grouped by horizon — short-horizon alerts (1d/7d) are more actionable, long-horizon ' +
    'alerts (90d/180d) are structural. Always pair with `get_macro_regime` for context — a distribution alert in a ' +
    'Risk-Off regime has different implications than in Broad Expansion.',
  {
    horizons: z.string().optional().describe('Comma-separated horizons (e.g. 7d,30d). Default: all horizons.'),
  },
  async ({ horizons }) => {
    const params: Record<string, string> = {};
    if (horizons) params.horizons = horizons;
    const data = await get('/api/market-pulse/divergences', params);
    return textResult(data);
  },
);

// ─── Tool 22b: Per-Asset Divergence Alerts ─────────────────────────

server.tool(
  'get_asset_divergences',
  'Per-asset cross-factor divergence alerts (ignition, capitulation, distribution) for a specific asset. Unlike ' +
    '`get_divergences` which shows market-wide cohort patterns, this returns divergences from the individual asset\'s ' +
    'own factor t-scores. Includes severity, the two factor classes involved, their scores, and relevance ' +
    '(severity × horizon weight). Use alongside `get_regime_analysis` for full per-asset conviction picture.',
  {
    asset: z.string().describe('Asset symbol (e.g. BTC, SOL)'),
  },
  async ({ asset }) => {
    const data = await get('/api/asset/regime', { symbol: asset });
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return textResult({
      ok: true,
      symbol: asset,
      asof_day: parsed.asof_day,
      divergences: parsed.divergences ?? [],
    });
  },
);

// ─── Tool 23: Get Competition Leaderboard ──────────────────────────

server.tool(
  'get_competition_leaderboard',
  'Get the CRYPTYX Challenge leaderboard — ranked competition entries with Sharpe ratio, return, drawdown, and composite scores.',
  {
    round_id: z.string().optional().describe('Round ID (default: round_1)'),
    sort_by: z.enum(['composite_score', 'sharpe_ratio', 'total_return', 'max_drawdown']).optional().describe('Sort column (default: composite_score)'),
  },
  async ({ round_id, sort_by }) => {
    const params: Record<string, string> = {};
    if (round_id) params.round_id = round_id;
    if (sort_by) params.sort_by = sort_by;
    const data = await get('/api/competition/leaderboard', params);
    return textResult(data);
  },
);

// ─── Tool 24: Regime Analog (Tier 6) ───────────────────────────────

server.tool(
  'get_regime_analog',
  'PREMIUM — Regime Analog Engine Tier 6 read. Pairs the asset\'s current regime signature with its closest historical analog ' +
    'plus actionable proven setups, served as a six-field structured narrative (headline, frame, analog, environment, setup, ' +
    'invalidation). The underlying detector only fires on notable days — quiet days return found=false with no narrative, ' +
    'which is correct behaviour, not a failure. Call when the user asks for "what does today rhyme with", an analog read, ' +
    'historical parallel, or any Tier 6 take.\n\n' +
    'Output fields when found=true:\n' +
    '* narrative.headline — punchy title naming the asset and Supertrend state.\n' +
    '* narrative.frame — Supertrend state + 30d/90d anchor regime + divergence cluster (count + dominant pattern). The BACKDROP. Optional on rows persisted before 2026-06-15.\n' +
    '* narrative.analog — Then→Now: closest historical match, similarity %, ingredient match, outcome, and SAME/WEAKER/STRONGER vs today.\n' +
    '* narrative.environment — base-rate line: forward-return stats (n, mean, hit) at 7d/14d/30d in the asset\'s current 30d regime. Optional — omitted when sample is too thin (every horizon n<8) and on rows persisted before 2026-06-20.\n' +
    '* narrative.setup — tactical expression conditional on the Supertrend, with backtest n / hit rate / mean return.\n' +
    '* narrative.invalidation — two-part kill: setup-level signal kill FIRST, then frame-level (primarily Supertrend rolling over).\n' +
    'All present narrative fields — quote VERBATIM. Do not rewrite or summarize the narrative; the ' +
    'institutional value is in the exact phrasing and the cited backtest numbers.\n' +
    '* signature — the current regime signature (cluster, divergence pattern, short/long regime votes).\n' +
    '* analog — top historical matches with similarity scores + structural diff vs current.\n' +
    '* setups — paired proven setups with backtest stats (n, hit rate, mean return).\n' +
    '* computed_at — when the nightly pipeline last refreshed this row. If older than 3 days, flag staleness.\n\n' +
    'TIER GATES: returns a 403-equivalent payload (gate_denied:true) when the caller\'s tier does not cover the request. The ' +
    'engine itself requires Pro+; programmatic access (this tool) requires Institutional+; historical asof_day requires ' +
    'Institutional+. If the response contains `error: "killswitch_off"`, an admin has temporarily disabled the engine — try ' +
    'again later, do not retry in a loop.\n\n' +
    'HALLUCINATION GUARD: every claim about the analog\'s outcome MUST be sourced from the narrative or backtest stats in the ' +
    'response. Do not invent setup names, target prices, or invalidation levels that are not in the returned narrative.',
  {
    asset: z.string().optional().describe('Asset symbol (e.g. BTC, ETH). Default BTC.'),
    asof_day: z.string().optional().describe('Date in YYYY-MM-DD. Institutional tier only. Omit for the latest fired row.'),
  },
  async ({ asset, asof_day }) => {
    const params: Record<string, string> = { asset: asset ?? 'BTC' };
    if (asof_day) params.asof_day = asof_day;
    const data = await get('/api/analog/tier6', params);
    return textResult(data);
  },
);

// ─── Tool 22: Get Competition Rounds ───────────────────────────────

server.tool(
  'get_competition_rounds',
  'List all competition rounds with rules, asset universe, and entry counts. Shows active and past rounds.',
  {},
  async () => {
    const data = await get('/api/competition/rounds');
    return textResult(data);
  },
);

// ─── Tool 23: Get Trigger Preset ───────────────────────────────────

server.tool(
  'get_trigger_preset',
  'INSTITUTIONAL-GRADE TRIGGER EVALUATION — evaluate one of the curated trigger presets against a specific asset. ' +
    'Returns the full institutional evidence envelope: 5-year backtest with sample size, hit rate, Sharpe, Sortino, ' +
    'max drawdown, profit factor, regime-conditional performance, and rolling 30/90-day hit rates. This is what a ' +
    'quant desk asks for before acting on any signal. HALLUCINATION GUARD: only recommend action when fires_now=true ' +
    'AND the evidence packet passes an institutional gate (Sharpe > 0.3, profit_factor > 1.5, sample_size > 50). ' +
    'A signal firing without institutional evidence is not actionable.\n\n' +
    'Available presets:\n' +
    '* `mean_reversion_price` — TR_ROC_7D z-score exceeds 1.5 (classic mean-rev)\n' +
    '* `vol_expansion_alert` — VOL_RV_7D z-score exceeds 1.5 (regime shift warning)\n' +
    '* `vol_regime_break` — z(VOL_RV_7D) − z(VOL_RV_30D) diverges (vol regime inflection)\n' +
    '* `flow_inflection` — z(FLOW_TAKER_BS_7D) − z(FLOW_TAKER_BS_30D) diverges\n' +
    '* `treasury_manager_classic` — return mean-rev filtered by vol band (highest-conviction preset)\n\n' +
    'Call with no preset_id to list all available presets.',
  {
    preset_id: z.string().optional().describe(
      'Preset ID — one of: mean_reversion_price, vol_expansion_alert, vol_regime_break, flow_inflection, treasury_manager_classic. Omit to list all.',
    ),
    asset: z.string().optional().describe('Asset symbol (e.g. BTC). Required when preset_id is provided.'),
    horizon: z.enum(['7d', '14d', '30d']).optional().describe('Forward-return horizon (default 14d for most presets).'),
  },
  async ({ preset_id, asset, horizon }) => {
    const params: Record<string, string> = {};
    if (preset_id) params.preset_id = preset_id;
    if (asset) params.asset = asset;
    if (horizon) params.horizon = horizon;
    const data = await get('/api/triggers/preset', params);
    return textResult(data);
  },
);

// ─── Tool 24: Get Trigger Z-Score ──────────────────────────────────

server.tool(
  'get_trigger_z_score',
  'Single-metric z-score threshold trigger. Pass any metric_id from the CRYPTYX catalog (440+ metrics across 8 factor ' +
    'classes: CORR, EFF, FLOW, FUT, OB, OPT, TR, VOL) and get the full institutional evidence envelope. Same envelope ' +
    'shape as `get_trigger_preset` — sample size, Sharpe, Sortino, MDD, profit factor, regime context. Use when you ' +
    'want a specific factor triggered on a specific asset with a specific threshold, without needing a named preset.',
  {
    asset: z.string().describe('Asset symbol (e.g. BTC).'),
    metric_id: z.string().describe('Metric ID (e.g. TR_ROC_7D, VOL_RV_30D, FLOW_TAKER_BS_RATIO_MA_7D).'),
    operator: z.enum(['gt', 'lt', 'gte', 'lte', 'abs_gt']).describe(
      'Comparison operator. abs_gt is a two-sided z-score threshold (fires on either extreme).',
    ),
    threshold: z.number().describe('Z-score threshold (e.g. 1.5 for a 1.5-sigma trigger).'),
    horizon: z.enum(['7d', '14d', '30d']).optional().describe('Forward-return horizon (default 14d).'),
  },
  async ({ asset, metric_id, operator, threshold, horizon }) => {
    const params: Record<string, string> = { asset, metric_id, operator, threshold: String(threshold) };
    if (horizon) params.horizon = horizon;
    const data = await get('/api/triggers/z-score', params);
    return textResult(data);
  },
);

// ─── Tool 25: Get Trigger Z-Differential ───────────────────────────

server.tool(
  'get_trigger_z_differential',
  'THE GENERALIZED CROSSOVER PRIMITIVE — fires on the delta z(metric_a) − z(metric_b). Typically used with the same ' +
    'underlying factor at different windows (e.g. VOL_RV_7D vs VOL_RV_30D captures a vol regime inflection). Applies ' +
    'to any factor family: TR (return momentum acceleration), VOL (vol regime break), FLOW (flow bias shift), FUT ' +
    '(funding stress acceleration), OB (imbalance regime shift), CORR (decoupling from BTC). Returns full institutional ' +
    'evidence envelope.',
  {
    asset: z.string().describe('Asset symbol (e.g. BTC).'),
    metric_a_id: z.string().describe('First metric ID (typically short window, e.g. VOL_RV_7D).'),
    metric_b_id: z.string().describe('Second metric ID (typically long window, e.g. VOL_RV_30D).'),
    operator: z.enum(['gt', 'lt', 'gte', 'lte', 'abs_gt']).describe('Comparison on z(a) − z(b).'),
    threshold: z.number().describe('Threshold on the differential (e.g. 1.0 for a 1-sigma delta).'),
    horizon: z.enum(['7d', '14d', '30d']).optional().describe('Forward-return horizon (default 14d).'),
  },
  async ({ asset, metric_a_id, metric_b_id, operator, threshold, horizon }) => {
    const params: Record<string, string> = { asset, metric_a_id, metric_b_id, operator, threshold: String(threshold) };
    if (horizon) params.horizon = horizon;
    const data = await get('/api/triggers/z-differential', params);
    return textResult(data);
  },
);

// ─── Tool 26: Custom Trigger Evaluation ────────────────────────────

server.tool(
  'evaluate_custom_trigger',
  'EXTENSIBILITY ENDPOINT — evaluate an arbitrary trigger definition. Pass a JSON definition (z_score, z_differential, ' +
    'or composite) and get the full institutional evidence envelope in one call. Use when the named presets and single ' +
    'trigger types are not expressive enough — e.g. composite conditions like `TR_ROC_7D abs_gt 1.5 AND VOL_RV_7D lt 1.0 ' +
    'AND FLOW_TAKER_BS_RATIO_MA_7D gt 0`. Every request runs a live 5-year backtest, so this is enterprise-tier.',
  {
    asset: z.string().describe('Asset symbol (e.g. BTC).'),
    horizon: z.enum(['7d', '14d', '30d']).optional().describe('Forward-return horizon (default 14d).'),
    definition: z
      .record(z.unknown())
      .describe(
        'Trigger definition JSON. Shape depends on type field:\n' +
          '* z_score:        { type: "z_score", metric_id, operator, threshold }\n' +
          '* z_differential: { type: "z_differential", metric_a_id, metric_b_id, operator, threshold }\n' +
          '* composite:      { type: "composite", logic: "AND"|"OR", conditions: [{ metric_id, operator, threshold }, ...] }',
      ),
  },
  async ({ asset, horizon, definition }) => {
    const body: Record<string, unknown> = { asset, definition };
    if (horizon) body.horizon = horizon;
    const data = await post('/api/triggers/custom', body);
    return textResult(data);
  },
);

// ─── Start ───────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
