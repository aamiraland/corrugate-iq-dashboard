export const EMPTY = { from: '', to: '', line: '', shift: '', reason: '', customer: '', boxType: '' };
const NUM = { numeric: true };
export const sortDesc = (a) => [...a].sort((x, y) => y.value - x.value);
export const sortName = (a) => [...a].sort((x, y) => String(x.name).localeCompare(String(y.name), undefined, NUM));
const uniq = (a) => [...new Set(a.filter((v) => v != null))].sort((x, y) => String(x).localeCompare(String(y), undefined, NUM));
export const sum = (rows, k) => rows.reduce((a, r) => a + (r[k] ?? 0), 0);
export const has = (rows, k) => rows.some((r) => r[k] != null);
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const weekday = (d) => (d ? WD[new Date(`${d}T00:00:00Z`).getUTCDay()] : null);

export function groupBy(rows, key, val) {
  const m = new Map();
  rows.forEach((r) => {
    const k = typeof key === 'function' ? key(r) : r[key];
    const name = k == null ? 'Unspecified' : k;
    const e = m.get(name) || { name, value: 0, count: 0 };
    const v = val ? val(r) : 1;
    if (v != null) e.value += v;
    e.count += 1;
    m.set(name, e);
  });
  return [...m.values()];
}
export function pivot(rows, xKey, sKey, vKey) {
  const series = uniq(rows.map((r) => r[sKey]));
  const m = new Map();
  rows.forEach((r) => {
    if (r[xKey] == null || r[sKey] == null) return;
    const e = m.get(r[xKey]) || { name: r[xKey] };
    e[r[sKey]] = (e[r[sKey]] || 0) + (r[vKey] ?? 0);
    m.set(r[xKey], e);
  });
  return { series, data: sortName([...m.values()]) };
}

// ---- Filters: only the keys listed for the current page are applied ----
export function getOptions(d) {
  return {
    lines: uniq([...d.production.map((r) => r.line), ...d.downtime.map((r) => r.line)]),
    shifts: uniq([...d.production.map((r) => r.shift), ...d.downtime.map((r) => r.shift)]),
    reasons: uniq(d.downtime.map((r) => r.reason)),
    customers: uniq(d.orders.map((o) => o.customer)),
    boxTypes: uniq([...d.production.map((r) => r.boxType), ...d.orders.map((o) => o.boxType)]),
    ...(() => {
      const ds = [...d.production.map((r) => r.date), ...d.downtime.map((r) => r.date), ...d.orders.map((o) => o.orderDate)].filter(Boolean).sort();
      return { minDate: ds[0] || '', maxDate: ds[ds.length - 1] || '' };
    })(),
  };
}
export function applyFilters(d, f, keys) {
  const on = (k) => keys.includes(k) && f[k];
  const inR = (x) => !(on('from') || on('to')) || (!!x && (!on('from') || x >= f.from) && (!on('to') || x <= f.to));
  const eq = (k, v) => !on(k) || v === f[k];
  return {
    production: d.production.filter((r) => inR(r.date) && eq('line', r.line) && eq('shift', r.shift) && eq('boxType', r.boxType)),
    downtime: d.downtime.filter((r) => inR(r.date) && eq('line', r.line) && eq('shift', r.shift) && eq('reason', r.reason)),
    orders: d.orders.filter((o) => inR(o.orderDate) && eq('customer', o.customer) && eq('boxType', o.boxType)),
  };
}

const avgBy = (rows, key, vk) => groupBy(rows.filter((r) => r[vk] != null), key, (r) => r[vk]).map((g) => ({ name: g.name, value: g.value / g.count, count: g.count }));

export function computeStats({ production: P, downtime: D, orders: O }) {
  const dated = P.filter((r) => r.date);
  const daily = sortName(groupBy(dated, 'date', (r) => r.output));
  const byVal = sortDesc(daily);
  const wasteN = P.filter((r) => r.waste != null).length;
  const prod = {
    records: P.length, output: sum(P, 'output'), waste: sum(P, 'waste'), wasteRecords: wasteN,
    byLine: sortDesc(groupBy(P, 'line', (r) => r.output)),
    byShift: sortDesc(groupBy(P, 'shift', (r) => r.output)),
    byBox: sortDesc(groupBy(P.filter((r) => r.boxType), 'boxType', (r) => r.output)),
    wasteByLine: sortDesc(groupBy(P, 'line', (r) => r.waste)),
    wasteByShift: sortDesc(groupBy(P, 'shift', (r) => r.waste)),
    wasteByBox: sortDesc(groupBy(P.filter((r) => r.boxType), 'boxType', (r) => r.waste)),
    wasteAvgByShift: sortDesc(avgBy(P, 'shift', 'waste')),
    daily, wasteDaily: sortName(groupBy(dated, 'date', (r) => r.waste)),
    avgDaily: daily.length ? sum(P, 'output') / daily.length : null,
    avgWaste: wasteN ? sum(P, 'waste') / wasteN : null,
    topDay: byVal[0] || null, lowDay: byVal[byVal.length - 1] || null,
  };
  const dd = D.filter((r) => r.date);
  const wdAll = groupBy(dd, (r) => weekday(r.date), (r) => r.minutes);
  const longest = D.filter((r) => r.minutes != null).sort((a, b) => b.minutes - a.minutes)[0] || null;
  const minutes = sum(D, 'minutes');
  const down = {
    events: D.length, minutes, avg: D.length ? minutes / D.filter((r) => r.minutes != null).length : null,
    byReason: sortDesc(groupBy(D, 'reason', (r) => r.minutes)),
    byLine: sortDesc(groupBy(D, 'line', (r) => r.minutes)),
    byShift: sortDesc(groupBy(D, 'shift', (r) => r.minutes)),
    daily: sortName(groupBy(dd, 'date', (r) => r.minutes)),
    byWeekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((n) => wdAll.find((w) => w.name === n)).filter(Boolean),
    longest,
  };
  const lines = uniq([...P.map((r) => r.line), ...D.map((r) => r.line)]);
  const machines = lines.map((line) => {
    const p = P.filter((r) => r.line === line), d = D.filter((r) => r.line === line);
    const m = sum(d, 'minutes');
    return { line, output: sum(p, 'output'), waste: sum(p, 'waste'), minutes: m, events: d.length, avg: d.length ? m / d.length : null };
  });
  const disp = O.filter((o) => o.status === 'On-time' || o.status === 'Delayed');
  const onTime = disp.filter((o) => o.status === 'On-time').length;
  const delayed = O.filter((o) => o.status === 'Delayed');
  const tl = new Map();
  disp.forEach((o) => { const e = tl.get(o.dueDate) || { name: o.dueDate, 'On-time': 0, Delayed: 0 }; e[o.status] += 1; tl.set(o.dueDate, e); });
  const orders = {
    total: O.length, onTime, delayed: delayed.length, dispatched: disp.length,
    open: O.filter((o) => o.status === 'Not dispatched').length,
    otd: disp.length ? (onTime / disp.length) * 100 : null,
    maxDelay: delayed.reduce((a, o) => Math.max(a, o.delayDays || 0), 0),
    byStatus: groupBy(O, 'status').filter((g) => g.value > 0),
    byCustomer: sortDesc(groupBy(O, 'customer')), byBox: sortDesc(groupBy(O, 'boxType')),
    delayedByCustomer: sortDesc(groupBy(delayed, 'customer')), delayedByBox: sortDesc(groupBy(delayed, 'boxType')),
    timeline: sortName([...tl.values()]),
  };
  return { prod, down, orders, machines };
}

// Estimates only, from Cost_Assumptions. Returns null when assumptions are absent.
export function computeCosts(assumptions, s) {
  const rate = (name) => assumptions.find((a) => a.item && a.item.toLowerCase() === String(name).toLowerCase() && a.value != null);
  const paper = rate('Paper');
  const paperCost = paper ? s.prod.waste * paper.value : null;
  const missing = [];
  let downCost = 0;
  s.down.byLine.forEach((l) => { const r = rate(l.name); if (r) downCost += l.value * r.value; else missing.push(l.name); });
  const anyRate = s.down.byLine.some((l) => rate(l.name));
  return paperCost == null && !anyRate ? null : { paperCost, downCost: anyRate ? downCost : null, missing };
}
