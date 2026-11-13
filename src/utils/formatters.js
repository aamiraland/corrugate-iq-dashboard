export const fmtNum = (n, d = 0) =>
  n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtPct = (n) => (n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(1)}%`);
export const fmtDur = (min) => {
  if (min == null || !Number.isFinite(min)) return '—';
  let h = Math.floor(min / 60), m = Math.round(min % 60);
  if (m === 60) { h += 1; m = 0; }
  return `${h}h ${m}m`;
};
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (iso) => (iso ? `${iso.slice(8, 10)} ${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}` : '—');
export const fmtShort = (iso) => (iso ? `${iso.slice(8, 10)} ${MON[+iso.slice(5, 7) - 1]}` : '');
const serialISO = (v) => new Date((Math.floor(v) - 25569) * 864e5).toISOString().slice(0, 10);
export const fmtTime = (v) => {
  if (typeof v !== 'number') return '—';
  const mins = Math.round((v % 1) * 1440);
  return `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
};
// Format a raw Excel cell for display (Data Explorer)
export const fmtCell = (col, v) => {
  if (v == null || v === '') return '—';
  if (typeof v === 'number' && /time/i.test(col)) return `${fmtDate(serialISO(v))} ${fmtTime(v)}`;
  if (typeof v === 'number' && /date|dispatch/i.test(col)) return fmtDate(serialISO(v));
  return typeof v === 'number' ? fmtNum(v, Number.isInteger(v) ? 0 : 1) : String(v);
};
