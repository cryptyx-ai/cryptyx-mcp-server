import pc from 'picocolors';

interface TableOptions {
  columns?: string[];
  maxWidth?: number;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(4);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function printTable(data: unknown, opts?: TableOptions): void {
  // Handle arrays of objects (most common API response shape)
  const rows = Array.isArray(data) ? data : extractRows(data);

  if (rows.length === 0) {
    console.log(pc.dim('  (no data)'));
    return;
  }

  // Determine columns
  const columns = opts?.columns ?? Object.keys(rows[0] as Record<string, unknown>);
  const maxWidth = opts?.maxWidth ?? 30;

  // Format all cells
  const formatted = rows.map(row => {
    const r = row as Record<string, unknown>;
    return columns.map(col => truncate(formatCell(r[col]), maxWidth));
  });

  // Compute column widths
  const widths = columns.map((col, i) => {
    const dataMax = formatted.reduce((max, row) => Math.max(max, row[i].length), 0);
    return Math.max(col.length, dataMax);
  });

  // Print header
  const header = columns.map((col, i) => col.padEnd(widths[i])).join('  ');
  console.log(pc.bold(header));
  console.log(pc.dim(widths.map(w => '\u2500'.repeat(w)).join('  ')));

  // Print rows
  for (const row of formatted) {
    const line = row.map((cell, i) => {
      const padded = cell.padEnd(widths[i]);
      return padded;
    }).join('  ');
    console.log(line);
  }
}

/** Try to extract an array from common API response shapes */
function extractRows(data: unknown): Record<string, unknown>[] {
  if (typeof data !== 'object' || data === null) return [];
  const obj = data as Record<string, unknown>;

  // Common patterns: { data: [...] }, { rows: [...] }, { results: [...] }, { assets: [...] }
  for (const key of ['data', 'rows', 'results', 'assets', 'signals', 'metrics', 'entries', 'rounds', 'tools']) {
    if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
  }

  // If the top-level object itself has useful keys, wrap it as a single row
  const keys = Object.keys(obj);
  if (keys.length > 0 && keys.length <= 20) return [obj];

  return [];
}

export function printKeyValue(data: Record<string, unknown>, indent = 0): void {
  const pad = ' '.repeat(indent);
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      console.log(`${pad}${pc.cyan(key)}:`);
      printKeyValue(value as Record<string, unknown>, indent + 2);
    } else if (Array.isArray(value)) {
      console.log(`${pad}${pc.cyan(key)}: ${pc.dim(`[${value.length} items]`)}`);
    } else {
      console.log(`${pad}${pc.cyan(key)}: ${formatCell(value)}`);
    }
  }
}
