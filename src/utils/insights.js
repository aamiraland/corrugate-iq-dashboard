import { fmtNum, fmtPct, fmtDur, fmtDate } from './formatters';
import { weekday } from './calc';

// Transparent thresholds used by the rule engine
export const T = { lineHigh: 1.25, shiftHigh: 1.5, trend: 0.1, zLow: 1.5, zHigh: 2, lateCritical: 0.25, pattern: 2 };
const BASE = { critical: 100, warning: 80, positive: 50, info: 30 };
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const share = (v, t) => (t > 0 ? (v / t) * 100 : null);
const halves = (vals) => {
  if (vals.length < 6) return null;
  const h = Math.floor(vals.length / 2), a = mean(vals.slice(0, h)), b = mean(vals.slice(h));
  return a > 0 ? { a, b, pct: (b - a) / a } : null;
};
// top item vs mean of the rest
const outlier = (arr) => {
  if (arr.length < 2) return null;
  const rest = mean(arr.slice(1).map((x) => x.value));
  return rest > 0 ? { top: arr[0], rest, ratio: arr[0].value / rest } : null;
};

export function buildInsights(f, s) {
  const out = [];
  const add = (id, sev, cat, rank, headline, metric, text, rec) => out.push({ id, sev, cat, score: BASE[sev] + rank, headline, metric, text, rec });
  const { prod, down, orders } = s;

  // ---- Production ----
  if (prod.byLine.length >= 2 && prod.output > 0) {
    const t = prod.byLine[0], l = prod.byLine[prod.byLine.length - 1];
    add('p-line', 'info', 'production', 6, `${t.name} has the highest output`, `${fmtNum(t.value)} sqm`,
      `It produced ${fmtPct(share(t.value, prod.output))} of recorded output; ${l.name} is lowest at ${fmtNum(l.value)} sqm.`,
      `Compare run patterns on ${l.name} with ${t.name} to understand the gap.`);
  }
  if (prod.byShift.length >= 2 && prod.output > 0) {
    const t = prod.byShift[0], l = prod.byShift[prod.byShift.length - 1];
    add('p-shift', 'info', 'production', 2, `Shift ${t.name} has the highest output`, `${fmtNum(t.value)} sqm`,
      `Shift ${l.name} is lowest at ${fmtNum(l.value)} sqm (${fmtPct(share(t.value - l.value, t.value))} below the top shift).`);
  }
  const dv = prod.daily.map((d) => d.value);
  if (dv.length >= 7 && sd(dv) > 0) {
    const m = mean(dv), sdv = sd(dv), low = prod.lowDay, z = (low.value - m) / sdv;
    if (z <= -T.zLow)
      add('p-dip', 'warning', 'production', 10, `Unusual production drop on ${fmtDate(low.name)}`, `${fmtNum(low.value)} sqm`,
        `${fmtPct(share(m - low.value, m))} below the daily average of ${fmtNum(m)} sqm (${Math.abs(z).toFixed(1)} std. deviations).`,
        'Review production and downtime records for this date.');
  }
  const pt = halves(dv);
  if (pt && Math.abs(pt.pct) >= T.trend)
    add('p-trend', pt.pct < 0 ? 'warning' : 'positive', 'production', 8, `Daily output is trending ${pt.pct < 0 ? 'down' : 'up'}`, `${pt.pct > 0 ? '+' : ''}${fmtPct(pt.pct * 100)}`,
      `Average daily output is ${fmtNum(pt.b)} sqm in the later half of the period vs ${fmtNum(pt.a)} sqm in the earlier half.`,
      pt.pct < 0 ? 'Check downtime and order records for the later half of the period.' : undefined);

  // ---- Waste ----
  const wsh = prod.wasteAvgByShift;
  const wo = outlier(wsh);
  if (wsh.length >= 2 && wo && prod.waste > 0) {
    const tot = prod.wasteByShift.find((x) => x.name === wo.top.name);
    if (wo.ratio >= T.shiftHigh)
      add('w-shift', 'warning', 'waste', 12, `Shift ${wo.top.name} records the most waste per run`, `${fmtNum(wo.top.value, 1)} kg / record`,
        `${fmtNum(wo.ratio, 1)}x the average of other shifts (${fmtNum(wo.rest, 1)} kg); ${fmtPct(share(tot?.value, prod.waste))} of total recorded waste.`,
        `Review Shift ${wo.top.name} run records and practices against other shifts.`);
    else if (tot)
      add('w-shift', 'info', 'waste', 4, `Shift ${tot.name} records the most waste`, `${fmtNum(tot.value)} kg`,
        `${fmtPct(share(tot.value, prod.waste))} of recorded waste; no shift exceeds ${T.shiftHigh}x the others per record.`);
  }
  if (prod.wasteByLine.length >= 2 && prod.waste > 0) {
    const t = prod.wasteByLine[0];
    add('w-line', 'info', 'waste', 3, `${t.name} records the most waste`, `${fmtNum(t.value)} kg`,
      `${fmtPct(share(t.value, prod.waste))} of recorded waste in the selected period.`, `Review ${t.name} waste records by shift and box type.`);
  }
  const wv = prod.wasteDaily.map((d) => d.value);
  if (wv.length >= 7 && sd(wv) > 0) {
    const m = mean(wv), top = [...prod.wasteDaily].sort((a, b) => b.value - a.value)[0], z = (top.value - m) / sd(wv);
    if (z >= T.zHigh)
      add('w-spike', 'warning', 'waste', 9, `Waste spike on ${fmtDate(top.name)}`, `${fmtNum(top.value)} kg`,
        `${fmtPct(share(top.value - m, m))} above the daily average of ${fmtNum(m)} kg (${z.toFixed(1)} std. deviations).`, 'Review that day\'s production records.');
  }
  const wt = halves(wv);
  if (wt && Math.abs(wt.pct) >= T.trend)
    add('w-trend', wt.pct > 0 ? 'warning' : 'positive', 'waste', 7, `Recorded waste is trending ${wt.pct > 0 ? 'up' : 'down'}`, `${wt.pct > 0 ? '+' : ''}${fmtPct(wt.pct * 100)}`,
      `Average daily waste is ${fmtNum(wt.b)} kg in the later half vs ${fmtNum(wt.a)} kg in the earlier half.`);

  // ---- Downtime ----
  const lo = outlier(down.byLine);
  if (lo && down.minutes > 0) {
    const high = lo.ratio >= T.lineHigh;
    add('d-line', high ? 'warning' : 'info', 'downtime', high ? 11 : 5, `${lo.top.name} has ${high ? 'unusually high' : 'the highest'} recorded downtime`, fmtDur(lo.top.value),
      high ? `${fmtNum(lo.ratio, 1)}x the average of other lines/machines; ${fmtPct(share(lo.top.value, down.minutes))} of recorded downtime.`
        : `${fmtPct(share(lo.top.value, down.minutes))} of recorded downtime; within ${T.lineHigh}x of the other lines.`,
      `Review ${lo.top.name} downtime events and its most frequent categories.`);
  }
  if (down.byReason.length >= 2 && down.minutes > 0) {
    const t = down.byReason[0];
    add('d-reason', 'info', 'downtime', 8, `"${t.name}" consumes the most downtime`, fmtDur(t.value),
      `${fmtPct(share(t.value, down.minutes))} of recorded downtime across ${t.count} events.`, `Review the ${t.count} "${t.name}" events for recurring conditions.`);
    const fq = [...down.byReason].sort((a, b) => b.count - a.count)[0];
    if (fq.name !== t.name)
      add('d-freq', 'info', 'downtime', 3, `"${fq.name}" is the most frequent downtime category`, `${fq.count} events`,
        `${fmtPct(share(fq.count, down.events))} of events but ${fmtDur(fq.value)} in total.`);
  }
  if (down.events >= 5 && down.longest)
    add('d-long', 'info', 'downtime', 4, 'Longest single downtime event', fmtDur(down.longest.minutes),
      `${down.longest.line || 'Unknown line'}, ${fmtDate(down.longest.date)}, shift ${down.longest.shift || '—'}, recorded as "${down.longest.reason || 'unspecified'}".`);
  // recurring pattern: reason concentrated on one line + weekday
  if (down.events >= 20) {
    let best = null;
    down.byReason.forEach((r) => {
      const ev = f.downtime.filter((d) => d.reason === r.name && d.date && d.line);
      if (ev.length < 8) return;
      const cells = new Map();
      ev.forEach((d) => { const k = `${d.line}|${weekday(d.date)}`; cells.set(k, (cells.get(k) || 0) + 1); });
      const [k, n] = [...cells.entries()].sort((a, b) => b[1] - a[1])[0];
      const avg = ev.length / cells.size;
      if (n >= 3 && n / avg >= T.pattern && (!best || n / avg > best.ratio)) best = { reason: r.name, k, n, total: ev.length, ratio: n / avg };
    });
    if (best) {
      const [line, wd] = best.k.split('|');
      add('d-pattern', 'info', 'downtime', 6, `"${best.reason}" events cluster on ${line} on ${wd}`, `${best.n} of ${best.total} events`,
        `${fmtNum(best.ratio, 1)}x the average per line/weekday combination. This is an observed pattern, not a confirmed cause.`, `Check ${line} ${wd} schedules and maintenance records.`);
    }
  }
  const dt = halves(down.daily.map((d) => d.value));
  if (dt && Math.abs(dt.pct) >= T.trend)
    add('d-trend', dt.pct > 0 ? 'warning' : 'positive', 'downtime', 7, `Daily downtime is trending ${dt.pct > 0 ? 'up' : 'down'}`, `${dt.pct > 0 ? '+' : ''}${fmtPct(dt.pct * 100)}`,
      `Average daily downtime is ${fmtDur(dt.b)} in the later half vs ${fmtDur(dt.a)} in the earlier half.`);

  // ---- Orders ----
  if (orders.dispatched >= 5) {
    const late = orders.delayed / orders.dispatched;
    if (orders.delayed > 0)
      add('o-otd', late >= T.lateCritical ? 'critical' : 'warning', 'orders', 10, `${orders.delayed} orders were dispatched after the due date`, `${fmtPct(orders.otd)} on-time`,
        `${orders.onTime} of ${orders.dispatched} dispatched orders met the due date; the longest delay was ${orders.maxDelay} day(s).`, 'Review dispatch planning for the delayed orders.');
    else add('o-otd', 'positive', 'orders', 5, 'All dispatched orders met their due date', '100.0% on-time', `${orders.onTime} orders dispatched on or before the due date.`);
  }
  if (orders.delayed >= 2) {
    const c = orders.delayedByCustomer[0], tc = orders.byCustomer.find((x) => x.name === c.name);
    add('o-cust', 'info', 'orders', 4, `${c.name} has the most delayed orders`, `${c.value} of ${tc?.value ?? '—'} orders`, 'Customer with the largest number of delayed orders in the selection.');
    const b = orders.delayedByBox[0];
    if (b && b.name !== 'Unspecified') add('o-box', 'info', 'orders', 3, `${b.name} orders are delayed most often`, `${b.value} delayed`, 'Box type with the largest number of delayed orders.');
  }
  if (orders.open > 0)
    add('o-open', 'info', 'orders', 2, `${orders.open} orders have no dispatch date`, `${orders.open} orders`, 'Excluded from the on-time calculation until a dispatch date is recorded.');

  return out.sort((a, b) => b.score - a.score);
}

// Top N overall, with at most `perCat` from any category for a balanced overview
export function pickTop(list, n = 6, perCat = 2) {
  const used = {}, out = [];
  list.forEach((i) => { if (out.length < n && (used[i.cat] = (used[i.cat] || 0) + 1) <= perCat) out.push(i); });
  return out;
}
