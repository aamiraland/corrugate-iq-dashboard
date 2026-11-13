import * as XLSX from 'xlsx';

const SHEETS = ['Orders', 'Production_Log', 'Downtime_Log', 'Cost_Assumptions', 'Read_Me'];

export const toNum = (v) => {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const clean = (v) => (v == null || String(v).trim() === '' ? null : String(v).trim());
// Excel serial number or date string -> 'YYYY-MM-DD' (null when missing/invalid)
export const toISO = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v < 20000 || v > 80000 ? null : new Date((Math.floor(v) - 25569) * 864e5).toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t - new Date(t).getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
};
const days = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);

export function parseWorkbook(buf) {
  const wb = XLSX.read(buf, { type: 'array' });
  const raw = {};
  SHEETS.forEach((n) => {
    if (!wb.Sheets[n]) return;
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: null, raw: true });
    const columns = (XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 })[0] || []).map(String);
    raw[n] = { columns, rows };
  });
  if (!raw.Production_Log && !raw.Downtime_Log && !raw.Orders) throw new Error('Workbook has none of the expected sheets (Orders, Production_Log, Downtime_Log).');

  const issues = [];
  const bad = (sheet, label, count) => count && issues.push(`${sheet}: ${count} row(s) with missing/invalid ${label}`);
  const rows = (n) => raw[n]?.rows || [];
  if (!raw.Production_Log) issues.push('Production_Log sheet not found');
  if (!raw.Downtime_Log) issues.push('Downtime_Log sheet not found');
  if (!raw.Orders) issues.push('Orders sheet not found');

  const production = rows('Production_Log').map((r) => ({
    date: toISO(r.date), line: clean(r.machine), shift: clean(r.shift), start: toNum(r.start_time), end: toNum(r.end_time),
    orderId: clean(r.order_id), boxType: clean(r.box_type), output: toNum(r.output_sqm), waste: toNum(r.waste_kg),
  }));
  const downtime = rows('Downtime_Log').map((r) => ({
    date: toISO(r.date), line: clean(r.machine), shift: clean(r.shift), orderId: clean(r.order_id), reason: clean(r.reason), minutes: toNum(r.minutes),
  }));
  const orders = rows('Orders').map((r) => {
    const o = { id: clean(r.order_id), customer: clean(r.customer), boxType: clean(r.box_type), qty: toNum(r.qty),
      orderDate: toISO(r.order_date), dueDate: toISO(r.due_date), dispatch: toISO(r.actual_dispatch) };
    // Business rule: compares actual DISPATCH date with DUE date (dispatch is not assumed to equal production completion)
    o.status = !o.dueDate ? 'Unknown' : !o.dispatch ? 'Not dispatched' : o.dispatch <= o.dueDate ? 'On-time' : 'Delayed';
    o.delayDays = o.status === 'Delayed' ? days(o.dispatch, o.dueDate) : o.status === 'On-time' ? 0 : null;
    return o;
  });
  bad('Production_Log', 'date', production.filter((r) => !r.date).length);
  bad('Production_Log', 'output_sqm', production.filter((r) => r.output == null).length);
  bad('Production_Log', 'waste_kg', production.filter((r) => r.waste == null).length);
  bad('Downtime_Log', 'date', downtime.filter((r) => !r.date).length);
  bad('Downtime_Log', 'minutes', downtime.filter((r) => r.minutes == null).length);
  bad('Orders', 'due_date', orders.filter((r) => !r.dueDate).length);
  const assumptions = rows('Cost_Assumptions').map((r) => ({ item: clean(r.cost_item), unit: clean(r.unit), value: toNum(r.assumption_value), notes: clean(r.notes) }));
  return { raw, production, downtime, orders, assumptions, issues };
}

export async function loadWorkbook() {
  const res = await fetch(`${process.env.PUBLIC_URL || ''}/data/corrugator_data.xlsx?v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Workbook could not be fetched (HTTP ${res.status}).`);
  const buf = await res.arrayBuffer();
  const b = new Uint8Array(buf);
  if (b[0] !== 0x50 || b[1] !== 0x4b) throw new Error('public/data/corrugator_data.xlsx was not found or is not a valid .xlsx file.');
  try { return parseWorkbook(buf); } catch (e) { throw new Error(`Workbook could not be read: ${e.message}`); }
}
