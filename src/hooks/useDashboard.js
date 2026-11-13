import { useCallback, useEffect, useRef, useState } from 'react';
import { loadWorkbook } from '../utils/excel';
import { EMPTY } from '../utils/calc';

export function useDashboardData() {
  const [st, setSt] = useState({ data: null, loading: true, refreshing: false, error: null, lastOk: null, okAt: 0 });
  const busy = useRef(false);
  const load = useCallback(async (manual) => {
    if (busy.current) return; // prevent overlapping requests
    busy.current = true;
    setSt((s) => ({ ...s, loading: !s.data, refreshing: !!s.data, error: null }));
    try {
      const data = await loadWorkbook();
      setSt((s) => ({ ...s, data, loading: false, refreshing: false, error: null, lastOk: new Date(), okAt: manual ? Date.now() : s.okAt }));
    } catch (e) { // keep previously loaded data on failure
      setSt((s) => ({ ...s, loading: false, refreshing: false, error: e.message || String(e) }));
    } finally { busy.current = false; }
  }, []);
  useEffect(() => {
    load(false);
    const t = setInterval(() => document.visibilityState === 'visible' && load(false), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);
  return { ...st, refresh: () => load(true) };
}

const OPT = [['line', 'lines'], ['shift', 'shifts'], ['reason', 'reasons'], ['customer', 'customers'], ['boxType', 'boxTypes']];
export function useFilters(opts) {
  const [f, setF] = useState(EMPTY);
  // after a refresh, drop selections that no longer exist in the data
  useEffect(() => {
    if (!opts) return;
    setF((p) => {
      const n = { ...p };
      let changed = false;
      OPT.forEach(([k, o]) => { if (n[k] && !opts[o].includes(n[k])) { n[k] = ''; changed = true; } });
      return changed ? n : p;
    });
  }, [opts]);
  return { f, set: (k, v) => setF((p) => ({ ...p, [k]: v })), reset: () => setF(EMPTY) };
}
