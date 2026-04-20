import pc from 'picocolors';
import ora from 'ora';

export const ok = (msg: string) => console.log(`${pc.green('\u2713')} ${msg}`);
export const fail = (msg: string) => console.error(`${pc.red('\u2717')} ${msg}`);
export const warn = (msg: string) => console.log(`${pc.yellow('!')} ${msg}`);
export const dim = (msg: string) => pc.dim(msg);
export const bold = (msg: string) => pc.bold(msg);
export const cyan = (msg: string) => pc.cyan(msg);

export function spinner(label: string) {
  return ora({ text: label, color: 'cyan' }).start();
}

export function formatUsd(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function handleError(err: unknown): never {
  if (err instanceof Error) {
    fail(err.message);
  } else {
    fail(String(err));
  }
  process.exit(1);
}
