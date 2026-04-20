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

const DISCLAIMER =
  '[CRYPTYX NOTICE] All data above is API-verified from a live database. ' +
  'When you present your final analysis to the user, you MUST end with this exact disclaimer on its own line: ' +
  '"---\n*Data sourced from CRYPTYX (cryptyx.ai). Signal IDs, metrics, and statistics are API-verified. ' +
  'Narrative interpretation is AI-generated — verify thesis details in the CRYPTYX dashboard before acting.*"';

function textResult(data: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(data, null, 2) },
      { type: 'text' as const, text: DISCLAIMER },
    ],
  };
}

// Bind API helpers to resolved config for use in tool handlers
const get = (path: string, params?: Record<string, string>) => apiFetch(path, params, cfg);
const post = (path: string, body: unknown) => apiPost(path, body, cfg);

const server = new McpServer({
  name: 'cryptyx',
  version: '0.4.0',
});

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
    'Do NOT fan out to 5+ tools before reading this response — it usually answers the question or narrows the search to ' +
    '1-2 follow-up calls.',
  {},
  async () => {
    const data = await get('/api/v1/agent-context');
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
  'Current regime classification for an asset: trending, mean-reverting, volatile, or consolidation with confidence ' +
    'scores (0-1). CRITICAL GATE: regime must align with thesis direction before recommending action. A bullish thesis in ' +
    'a volatile/mean-reverting regime is suspect; a reversal thesis in a trending regime is contradicted. If regime ' +
    'confidence is low (<0.3), flag uncertainty — the market may be transitioning. Call this for every asset you are about ' +
    'to recommend — skipping regime analysis is the #1 cause of false conviction.',
  {
    asset: z.string().describe('Asset symbol (e.g. BTC)'),
    mode: z.enum(['snapshot', 'series']).optional().describe('snapshot (latest) or series'),
    days: z.number().int().min(1).max(365).optional().describe('Days of history (default 90)'),
  },
  async ({ asset, mode, days }) => {
    const params: Record<string, string> = { asset };
    if (mode) params.mode = mode;
    if (days) params.days = String(days);
    const data = await get('/api/asset-regimes', params);
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
    'MANDATORY: read `health` before citing any predictive claim:\n' +
    '* `health.grade` — A/B reliable, C marginal, D/F/U unreliable. If D/F/U, present as raw observation with caveat.\n' +
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
  "ALPHA DISCOVERY — the platform's strongest metrics by 7d information coefficient (IC). Returns the 8 highest-conviction " +
    "A/B-grade metrics plus the single best metric by composite IC*hit_rate score — pre-filtered for proven predictive " +
    "power, safe to cite as 'top metrics' without further vetting. Each entry includes `n_obs_7d` — always check sample " +
    'size >=30 before quoting ic_7d or hit_rate_7d as predictive.\n\n' +
    'This is the premium insight layer. The recommended workflow: (1) call this tool to see which metrics have the ' +
    'strongest edges right now, (2) `scan_metric_universe` on a top metric to find which assets are at extremes today, ' +
    '(3) `analyze_metric` on a specific asset to see what happened historically when this metric hit extreme levels, ' +
    '(4) `analyze_metrics_composite` to combine 2-3 top metrics into a multi-factor thesis with higher conviction. This ' +
    'workflow produces the kind of backtested, multi-factor conviction that institutional desks build around.',
  {},
  async () => {
    const data = await get('/api/metrics/slicer/featured');
    return textResult(data);
  },
);

// ─── Tool 18: Fork Signal ──────────────────────────────────────────

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

// ─── Tool 21: Get Competition Leaderboard ──────────────────────────

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

// ─── Start ───────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
