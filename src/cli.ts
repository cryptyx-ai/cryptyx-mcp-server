#!/usr/bin/env node
/**
 * CRYPTYX CLI — human-facing interface to the CRYPTYX intelligence engine.
 * Calls the CRYPTYX REST API with the same API key and config file as the MCP server.
 */
import { defineCommand, runMain } from 'citty';
import { PACKAGE_VERSION } from './version.js';

import snapshot from './commands/snapshot.js';
import market from './commands/market.js';
import signals from './commands/signals.js';
import factors from './commands/factors.js';
import regime from './commands/regime.js';
import macroRegime from './commands/macro-regime.js';
import divergences from './commands/divergences.js';
import pulse from './commands/pulse.js';
import prices from './commands/prices.js';
import price from './commands/price.js';
import assets from './commands/assets.js';
import liquidity from './commands/liquidity.js';
import metrics from './commands/metrics.js';
import config from './commands/config.js';

const main = defineCommand({
  meta: {
    name: 'cryptyx',
    version: PACKAGE_VERSION,
    description: 'CRYPTYX — Digital Asset Intelligence. Institutional-grade quant intelligence for digital assets.',
  },
  subCommands: {
    snapshot,
    market,
    signals,
    factors,
    regime,
    'macro-regime': macroRegime,
    divergences,
    pulse,
    prices,
    price,
    assets,
    liquidity,
    metrics,
    config,
  },
});

runMain(main);
