import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import * as XLSX from 'xlsx';
import { Download, AlertTriangle, CheckCircle2, Info, OctagonAlert, Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, FilterX, Inbox, Loader2 } from 'lucide-react';
import { fmtNum, fmtShort } from '../utils/formatters';

export const C = { accent: '#2563eb', navy: '#0f2742', green: '#4f8a6b', amber: '#d08a2e', red: '#b5524f', grey: '#94a3b8',
  palette: ['#2563eb', '#0f2742', '#4f8a6b', '#d08a2e', '#7c8db5', '#b5524f', '#5aa9c9', '#8b6fb0'] };
export const STATUS_COLOR = { 'On-time': C.green, Delayed: C.red, 'Not dispatched': C.amber, Unknown: C.grey };
const ax = { tick: { fontSize: 11, fill: '#64748b' }, tickLine: false, axisLine: { stroke: '#e2e8f0' } };

export const Empty = ({ text = 'No data for the current selection' }) => (
  <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-slate-400 text-sm gap-2"><Inbox size={28} />{text}</div>
);
export const Notice = ({ children }) => (
  <div className="card px-4 py-3 text-sm text-slate-600 flex gap-2 items-start border-l-4 border-l-slate-300"><Info size={16} className="mt-0.5 shrink-0 text-slate-400" />{children}</div>
);
export const Spinner = () => <Loader2 size={16} className="animate-spin" />;

export function KPI({ icon: Icon, label, value, unit, sub, status }) {
  const bar = { warn: 'border-l-amber-500', crit: 'border-l-red-600', ok: 'border-l-emerald-600' }[status] || 'border-l-transparent';
  return (
    <div className={`card p-4 border-l-4 ${bar}`}>
      <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wide">{label}<Icon size={16} className="text-blue-600" /></div>
      <div className="mt-2 flex items-baseline gap-1.5"><span className="text-2xl font-semibold text-slate-900">{value}</span>{unit && <span className="text-sm text-slate-500">{unit}</span>}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
export const KPIGrid = ({ children }) => <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{children}</div>;

export function ChartCard({ title, subtitle, empty, height = 260, className = '', children }) {
  return (
    <div className={`card p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-3" style={{ height }}>{empty ? <Empty /> : children}</div>
    </div>
  );
}

export function BarC({ data, fmt = fmtNum, horizontal, color = C.accent, stack, colorMap, name = 'Value', xFmt }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 12, left: 0 }}>
        <CartesianGrid stroke="#eef2f6" vertical={!!horizontal} horizontal={!horizontal} />
        {horizontal ? <XAxis type="number" {...ax} tickFormatter={fmt} /> : <XAxis dataKey="name" {...ax} tickFormatter={xFmt} />}
        {horizontal ? <YAxis type="category" dataKey="name" width={115} {...ax} /> : <YAxis {...ax} tickFormatter={fmt} width={56} />}
        <Tooltip formatter={(v, n) => [fmt(v), n]} labelFormatter={xFmt} cursor={{ fill: '#f1f5f9' }} />
        {stack ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
        {stack
          ? stack.map((s) => <Bar key={s.key} dataKey={s.key} name={s.key} stackId="a" fill={s.color} />)
          : <Bar dataKey="value" name={name} fill={color} radius={[3, 3, 0, 0]} maxBarSize={48}>{colorMap && data.map((d, i) => <Cell key={i} fill={colorMap[d.name] || color} />)}</Bar>}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Area chart with one or more series; click a legend entry to hide/show a series
export function AreaC({ data, series, fmt = fmtNum }) {
  const [hidden, setHidden] = useState({});
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0 }}>
        <CartesianGrid stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="name" {...ax} tickFormatter={fmtShort} minTickGap={24} />
        <YAxis {...ax} tickFormatter={fmt} width={56} />
        <Tooltip formatter={(v, n) => [fmt(v), n]} labelFormatter={fmtShort} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, cursor: 'pointer' }} onClick={(e) => setHidden((h) => ({ ...h, [e.dataKey]: !h[e.dataKey] }))} />}
        {series.map((s, i) => (
          <Area key={s.key} dataKey={s.key} name={s.name || s.key} type="monotone" hide={!!hidden[s.key]} stroke={s.color || C.palette[i % 8]}
            fill={s.color || C.palette[i % 8]} fillOpacity={series.length > 1 ? 0.05 : 0.15} strokeWidth={2} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, fmt = fmtNum, colorMap }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="78%" paddingAngle={2}>
          {data.map((d, i) => <Cell key={d.name} fill={(colorMap && colorMap[d.name]) || C.palette[i % 8]} />)}
        </Pie>
        <Tooltip formatter={(v, n) => [fmt(v), n]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

const SEV = {
  critical: { icon: OctagonAlert, cls: 'border-l-red-600 text-red-700 bg-red-50', label: 'Critical' },
  warning: { icon: AlertTriangle, cls: 'border-l-amber-500 text-amber-700 bg-amber-50', label: 'Warning' },
  positive: { icon: CheckCircle2, cls: 'border-l-emerald-600 text-emerald-700 bg-emerald-50', label: 'Positive' },
  info: { icon: Info, cls: 'border-l-blue-500 text-blue-700 bg-blue-50', label: 'Info' },
};
export function InsightList({ items, title = 'Operational Insights' }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        <span className="text-xs text-slate-500">Rule-based · recalculated from the current selection</span>
      </div>
      {items.length === 0 ? <div className="card p-4"><Empty text="Not enough records to generate insights" /></div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((i) => {
            const S = SEV[i.sev];
            return (
              <div key={i.id} className={`card p-4 border-l-4 ${S.cls.split(' ')[0]}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase px-2 py-0.5 rounded ${S.cls.split(' ').slice(1).join(' ')}`}><S.icon size={12} />{S.label}</span>
                  <span className="text-sm font-semibold text-slate-900 text-right">{i.metric}</span>
                </div>
                <h4 className="mt-2 text-sm font-semibold text-slate-800">{i.headline}</h4>
                <p className="mt-1 text-sm text-slate-600">{i.text}</p>
                {i.rec && <p className="mt-2 text-xs text-slate-500"><span className="font-semibold text-slate-600">Recommendation: </span>{i.rec}</p>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}


const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
// Exports exactly the rows currently shown (after search + sort), all pages
function exportRows(kind, title, head, body) {
  const base = `${title.replace(/\W+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
  if (kind === 'csv') {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    saveBlob(new Blob(['\uFEFF' + [head, ...body].map((r) => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
  } else if (kind === 'xlsx') {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([head, ...body]), 'Data');
    XLSX.writeFile(wb, `${base}.xlsx`);
  } else {
    const w = window.open('', '_blank');
    if (!w) return alert('Please allow pop-ups to export PDF.');
    w.document.write(`<html><head><title>${esc(title)}</title><style>body{font:11px sans-serif;margin:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:3px 6px;text-align:left}th{background:#f1f5f9}</style></head><body><h3>${esc(title)} (${body.length} rows)</h3><table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  }
}

// columns: [{key,label,align,render(row)}]; rowClass(row) highlights records
export function DataTable({ columns, rows, rowClass, pageSize = 10, searchable = true, title }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(null);
  const [page, setPage] = useState(0);
  const shown = useMemo(() => {
    let r = rows;
    if (q.trim()) { const s = q.toLowerCase(); r = r.filter((x) => columns.some((c) => String(c.text ? c.text(x) : x[c.key] ?? '').toLowerCase().includes(s))); }
    if (sort) {
      const c = columns.find((x) => x.key === sort.key);
      const val = (x) => (c?.sortVal ? c.sortVal(x) : x[sort.key]);
      r = [...r].sort((a, b) => {
        const va = val(a), vb = val(b);
        if (va == null) return 1; if (vb == null) return -1;
        const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), undefined, { numeric: true });
        return sort.dir === 'asc' ? d : -d;
      });
    }
    return r;
  }, [rows, q, sort, columns]);
  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const p = Math.min(page, pages - 1);
  const slice = shown.slice(p * pageSize, p * pageSize + pageSize);
  const doExport = (kind) => exportRows(kind, title || 'export', columns.map((c) => c.label), shown.map((r) => columns.map((c) => (c.text ? c.text(r) : r[c.key]) ?? '')));
  const toggle = (k) => { setSort((s) => (s?.key === k ? (s.dir === 'asc' ? { key: k, dir: 'desc' } : null) : { key: k, dir: 'asc' })); setPage(0); };
  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800">{title} <span className="font-normal text-slate-500">({fmtNum(shown.length)} rows)</span></h3>
        <div className="flex items-center gap-2">
          {['csv', 'xlsx', 'pdf'].map((k) => <button key={k} disabled={!shown.length} onClick={() => doExport(k)} className="sel flex items-center gap-1 uppercase text-xs disabled:opacity-40" title={`Download ${shown.length} filtered rows as ${k.toUpperCase()}`}><Download size={12} />{k}</button>)}
        {searchable && <div className="relative"><Search size={14} className="absolute left-2 top-2.5 text-slate-400" /><input className="sel pl-7 w-56" placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></div>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>{columns.map((c) => (
              <th key={c.key} onClick={() => toggle(c.key)} className={`px-3 py-2 font-medium whitespace-nowrap cursor-pointer select-none ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                <span className="inline-flex items-center gap-1">{c.label}{sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</span>
              </th>))}</tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={i} className={`border-t border-slate-100 hover:bg-slate-50 ${rowClass ? rowClass(r) : ''}`}>
                {columns.map((c) => <td key={c.key} className={`px-3 py-2 whitespace-nowrap ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
              </tr>))}
          </tbody>
        </table>
        {shown.length === 0 && <div className="p-6"><Empty text="No matching records" /></div>}
      </div>
      <div className="flex items-center justify-between p-3 border-t border-slate-200 text-xs text-slate-500">
        <span>{shown.length ? `Showing ${p * pageSize + 1}–${Math.min(shown.length, (p + 1) * pageSize)} of ${fmtNum(shown.length)}` : '0 records'}</span>
        <div className="flex items-center gap-2">
          <button className="p-1 rounded border border-slate-300 disabled:opacity-40" disabled={p === 0} onClick={() => setPage(p - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
          Page {p + 1} / {pages}
          <button className="p-1 rounded border border-slate-300 disabled:opacity-40" disabled={p >= pages - 1} onClick={() => setPage(p + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
        </div>
      </div>
    </div>
  );
}

const LABEL = { line: 'Line / Machine', shift: 'Shift', reason: 'Category', customer: 'Customer', boxType: 'Box type' };
const OPTKEY = { line: 'lines', shift: 'shifts', reason: 'reasons', customer: 'customers', boxType: 'boxTypes' };
export function FilterBar({ f, set, reset, opts, keys }) {
  if (!keys.length) return null;
  const active = keys.filter((k) => f[k]);
  return (
    <div className="card p-3 flex flex-wrap items-end gap-3">
      {keys.includes('from') && ['from', 'to'].map((k) => (
        <label key={k} className="text-xs text-slate-500 flex flex-col gap-1">{k === 'from' ? 'From' : 'To'}
          <input type="date" className="sel" value={f[k]} min={opts.minDate} max={opts.maxDate} onChange={(e) => set(k, e.target.value)} /></label>))}
      {keys.filter((k) => OPTKEY[k]).map((k) => (
        <label key={k} className="text-xs text-slate-500 flex flex-col gap-1">{LABEL[k]}
          <select className="sel min-w-[120px]" value={f[k]} onChange={(e) => set(k, e.target.value)}>
            <option value="">All</option>{opts[OPTKEY[k]].map((o) => <option key={o} value={o}>{o}</option>)}</select></label>))}
      <button onClick={reset} disabled={!active.length} className="sel flex items-center gap-1 disabled:opacity-40"><FilterX size={14} />Reset filters</button>
      <span className="text-xs text-slate-500 ml-auto">{active.length ? `Active: ${active.map((k) => `${k === 'from' ? 'From' : k === 'to' ? 'To' : LABEL[k]} = ${f[k]}`).join(' · ')}` : 'No filters applied – showing the full dataset'}</span>
    </div>
  );
}
