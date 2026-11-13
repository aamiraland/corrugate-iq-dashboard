import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LayoutDashboard, Factory, Cpu, Clock, Recycle, Truck, Database, RefreshCw, Menu, X, PanelLeftClose, PanelLeftOpen, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import { useDashboardData, useFilters } from './hooks/useDashboard';
import { applyFilters, computeCosts, computeStats, getOptions } from './utils/calc';
import { buildInsights } from './utils/insights';
import { fmtDate } from './utils/formatters';
import { FilterBar, Spinner } from './components/ui';
import { Overview, Production, Machines, Downtime, Waste, Orders, Explorer } from './pages/pages';

const G = ['from', 'to', 'line', 'shift'];
const ROUTES = [
  { path: '/', label: 'Overview', icon: LayoutDashboard, keys: G, Page: Overview },
  { path: '/production', label: 'Production', icon: Factory, keys: [...G, 'boxType'], Page: Production },
  { path: '/machines', label: 'Machine Performance', icon: Cpu, keys: G, Page: Machines },
  { path: '/downtime', label: 'Downtime Analysis', icon: Clock, keys: [...G, 'reason'], Page: Downtime },
  { path: '/waste', label: 'Material & Waste', icon: Recycle, keys: [...G, 'boxType'], Page: Waste },
  { path: '/orders', label: 'Orders & Dispatch', icon: Truck, keys: ['from', 'to', 'customer', 'boxType'], Page: Orders },
  { path: '/explorer', label: 'Data Explorer', icon: Database, keys: [], Page: Explorer },
];

function Sidebar({ collapsed, setCollapsed, open, setOpen }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed lg:sticky top-0 z-40 h-screen bg-[#0f2742] text-slate-200 flex flex-col transition-all ${collapsed ? 'lg:w-16' : 'lg:w-60'} w-60 ${open ? 'left-0' : '-left-64 lg:left-0'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {!collapsed && <div><div className="font-bold tracking-wider text-white">CORRUGATE IQ</div><div className="text-[10px] text-slate-400 leading-tight">Manufacturing Operations Intelligence</div></div>}
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
          <button className="hidden lg:block text-slate-400 hover:text-white" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {ROUTES.map((r) => (
            <NavLink key={r.path} to={r.path} end onClick={() => setOpen(false)} title={r.label}
              className={({ isActive }) => `flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-sm ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}>
              <r.icon size={18} className="shrink-0" />{!collapsed && r.label}
            </NavLink>))}
        </nav>
        {!collapsed && <div className="p-3 text-[11px] text-slate-400 border-t border-white/10">Synthetic sample data – not actual factory records.</div>}
      </aside>
    </>
  );
}

function Topbar({ title, range, st, onMenu }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { if (!st.okAt) return; setOk(true); const t = setTimeout(() => setOk(false), 3000); return () => clearTimeout(t); }, [st.okAt]);
  return (
    <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex flex-wrap items-center gap-3 sticky top-0 z-20">
      <button className="lg:hidden" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{range}</span>
      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">Synthetic data</span>
      <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
        {ok && <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 size={14} />Data refreshed</span>}
        {st.lastOk && <span className="hidden sm:inline">Last refresh: {st.lastOk.toLocaleTimeString()}</span>}
        <button onClick={st.refresh} disabled={st.refreshing} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-md text-sm">
          {st.refreshing ? <Spinner /> : <RefreshCw size={14} />}Refresh Data</button>
        <span className="hidden sm:flex w-8 h-8 rounded-full bg-slate-200 items-center justify-center text-slate-600"><User size={16} /></span>
      </div>
    </header>
  );
}

const Skeleton = () => (
  <div className="p-6 space-y-4 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-slate-200" />)}</div>
    <div className="h-64 rounded-lg bg-slate-200" />
  </div>
);

export default function App() {
  const st = useDashboardData();
  const { data } = st;
  const loc = useLocation();
  const route = ROUTES.find((r) => r.path === loc.pathname) || ROUTES[0];
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const opts = useMemo(() => (data ? getOptions(data) : null), [data]);
  const flt = useFilters(opts);
  const eff = useMemo(() => (data ? applyFilters(data, flt.f, route.keys) : null), [data, flt.f, route]);
  const s = useMemo(() => (eff ? computeStats(eff) : null), [eff]);
  const ins = useMemo(() => (eff && s ? buildInsights(eff, s) : []), [eff, s]);
  const costs = useMemo(() => (data && s ? computeCosts(data.assumptions, s) : null), [data, s]);
  const range = opts ? `${fmtDate(flt.f.from && route.keys.includes('from') ? flt.f.from : opts.minDate)} – ${fmtDate(flt.f.to && route.keys.includes('to') ? flt.f.to : opts.maxDate)}` : 'Loading…';

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} open={open} setOpen={setOpen} />
      <div className="flex-1 min-w-0">
        <Topbar title={route.label} range={range} st={st} onMenu={() => setOpen(true)} />
        {st.error && (
          <div className="mx-4 lg:mx-6 mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>{data ? `Refresh failed – showing data from the last successful load. ${st.error}` : st.error}
              {!data && <button className="ml-3 underline" onClick={st.refresh}>Retry</button>}</div>
          </div>)}
        {st.loading && !data ? <Skeleton /> : data && (
          <main className="p-4 lg:p-6 space-y-5">
            {data.issues.length > 0 && <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">Data quality notes: {data.issues.join(' · ')}. Affected values are excluded, not estimated.</div>}
            <FilterBar f={flt.f} set={flt.set} reset={flt.reset} opts={opts} keys={route.keys} />
            <Routes>
              {ROUTES.map((r) => <Route key={r.path} path={r.path} element={<r.Page d={data} f={eff} s={s} ins={ins} costs={costs} />} />)}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>)}
      </div>
    </div>
  );
}
