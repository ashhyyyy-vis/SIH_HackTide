export function inr(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function pct(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n + '%';
}

export function years(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n + ' yrs';
}

export function fmtNumber(n: number): string {
  return n.toLocaleString('en-IN');
}