import React, { useMemo, useState } from 'react';
import { Factory, Trash2, Clock, Truck, ClipboardList, Layers, TrendingUp, CalendarDays, Wrench, Hash, AlertTriangle, IndianRupee, CheckCircle2, Timer } from 'lucide-react';
import { KPI, KPIGrid, ChartCard, BarC, AreaC, Donut, InsightList, DataTable, Notice, Empty, C, STATUS_COLOR } from '../components/ui';
import { fmtNum, fmtPct, fmtDur, fmtDate, fmtShort, fmtTime, fmtCell } from '../utils/formatters';
import { pickTop, T } from '../utils/insights';
import { has, pivot } from '../utils/calc';

const hrs = (a) => a.map((x) => ({ ...x, value: x.value / 60 }));
const fmtH = (v) => `${fmtNum(v, 1)} h`;
const sqm = (v) => `${fmtNum(v)} sqm`;
const kg = (v) => `${fmtNum(v)} kg`;
const Grid = ({ children, cols = 2 }) => <div className={`grid grid-cols-1 ${cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>{children}</div>;
const dailySeries = (rows, key) => rows.map((r) => ({ name: r.name, [key]: r.value }));
const byCat = (ins, ...cats) => ins.filter((i) => cats.includes(i.cat));

export function Overview({ s, ins, f }) {
  const { prod, down, orders } = s;
  const lines = [...new Set([...f.production, ...f.downtime].map((r) => r.line).filter(Boolean))];
  return (
    <div className="space-y-5">
      <KPIGrid>
        <KPI icon={Factory} label="Total Production Output" value={fmtNum(prod.output)} unit="sqm" sub={`${fmtNum(prod.records)} production records · avg ${fmtNum(prod.avgDaily)} sqm/day`} />
        <KPI icon={Trash2} label="Total Waste" value={fmtNum(prod.waste)} unit="kg" sub={`Avg ${fmtNum(prod.avgWaste, 1)} kg per production record`} />
        <KPI icon={Clock} label="Total Downtime" value={fmtNum(down.minutes / 60, 1)} unit="hours" sub={`${fmtDur(down.minutes)} · ${fmtNum(down.events)} events`} />
        <KPI icon={Truck} label="On-Time Delivery" value={fmtPct(orders.otd)} status={orders.delayed ? 'warn' : orders.otd != null ? 'ok' : undefined}
          sub={orders.otd == null ? 'No dispatched orders in selection' : `${orders.onTime} on-time · ${orders.delayed} delayed (dispatch vs due date)`} />
        <KPI icon={ClipboardList} label="Total Orders" value={fmtNum(orders.total)} sub="Not filtered by line or shift" />
        <KPI icon={Layers} label="Production Lines" value={fmtNum(lines.length)} sub={lines.join(', ') || 'None in selection'} />
      </KPIGrid>
      <ChartCard title="Daily Production Trend" subtitle="Output per day (sqm)" empty={!prod.daily.length}><AreaC data={dailySeries(prod.daily, 'Output')} series={[{ key: 'Output', color: C.accent }]} fmt={sqm} /></ChartCard>
      <Grid>
        <ChartCard title="Production by Line" empty={!prod.byLine.length}><BarC data={prod.byLine} fmt={sqm} name="Output" /></ChartCard>
        <ChartCard title="Waste by Shift" empty={!prod.wasteByShift.length || !prod.wasteRecords}><BarC data={prod.wasteByShift} fmt={kg} color={C.amber} name="Waste" /></ChartCard>
        <ChartCard title="Downtime by Category" subtitle="Hours" empty={!down.byReason.length}><Donut data={hrs(down.byReason)} fmt={fmtH} /></ChartCard>
        <ChartCard title="Order Delivery Status" empty={!orders.byStatus.length}><Donut data={orders.byStatus} colorMap={STATUS_COLOR} /></ChartCard>
      </Grid>
      <InsightList items={pickTop(ins, 6, 2)} />
    </div>
  );
}

export function Production({ s, f, ins }) {
  const { prod } = s;
  const cmp = useMemo(() => pivot(f.production, 'date', 'line', 'output'), [f.production]);
  const cols = [
    { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'line', label: 'Line' }, { key: 'shift', label: 'Shift' },
    { key: 'start', label: 'Start', render: (r) => fmtTime(r.start) }, { key: 'end', label: 'End', render: (r) => fmtTime(r.end) },
    { key: 'orderId', label: 'Order' }, { key: 'boxType', label: 'Box type' },
    { key: 'output', label: 'Output (sqm)', align: 'right', render: (r) => fmtNum(r.output) }, { key: 'waste', label: 'Waste (kg)', align: 'right', render: (r) => fmtNum(r.waste, 1) },
  ].filter((c) => has(f.production, c.key));
  return (
    <div className="space-y-5">
      <KPIGrid>
        <KPI icon={Factory} label="Total Production Output" value={fmtNum(prod.output)} unit="sqm" />
        <KPI icon={TrendingUp} label="Average Daily Production" value={fmtNum(prod.avgDaily)} unit="sqm/day" sub={`${prod.daily.length} production days`} />
        <KPI icon={Hash} label="Production Records" value={fmtNum(prod.records)} />
        <KPI icon={CalendarDays} label="Highest Production Day" value={prod.topDay ? fmtNum(prod.topDay.value) : '—'} unit="sqm" sub={prod.topDay && fmtDate(prod.topDay.name)} />
        <KPI icon={Layers} label="Top Line" value={prod.byLine[0]?.name ?? '—'} sub={prod.byLine.map((l) => `${l.name}: ${fmtNum(l.value)}`).join(' · ')} />
      </KPIGrid>
      <ChartCard title="Daily Production Trend" empty={!prod.daily.length}><AreaC data={dailySeries(prod.daily, 'Output')} series={[{ key: 'Output', color: C.accent }]} fmt={sqm} /></ChartCard>
      <Grid cols={3}>
        <ChartCard title="Production by Line" empty={!prod.byLine.length}><BarC data={prod.byLine} fmt={sqm} /></ChartCard>
        <ChartCard title="Production by Shift" empty={!prod.byShift.length || !has(f.production, 'shift')}><BarC data={prod.byShift} fmt={sqm} /></ChartCard>
        {has(f.production, 'boxType') && <ChartCard title="Production by Box Type" empty={!prod.byBox.length}><BarC data={prod.byBox} fmt={sqm} /></ChartCard>}
      </Grid>
      <ChartCard title="Production Comparison Across Dates" subtitle="Daily output per line – click legend to hide/show" height={280} empty={!cmp.data.length}>
        <AreaC data={cmp.data} series={cmp.series.map((k, i) => ({ key: k, color: C.palette[i % 8] }))} fmt={sqm} /></ChartCard>
      <InsightList items={byCat(ins, 'production').slice(0, 4)} title="Production Insights" />
      <DataTable title="Production Records" columns={cols} rows={f.production} />
    </div>
  );
}

export function Machines({ s, ins }) {
  const { machines, down } = s;
  const withDown = [...machines].sort((a, b) => b.minutes - a.minutes);
  const high = (m) => { const rest = machines.filter((x) => x.line !== m.line); return rest.length && m.minutes / (rest.reduce((a, x) => a + x.minutes, 0) / rest.length) >= T.lineHigh && m.minutes > 0; };
  const cols = [
    { key: 'line', label: 'Machine / Line' }, { key: 'output', label: 'Output (sqm)', align: 'right', render: (m) => fmtNum(m.output) },
    { key: 'minutes', label: 'Total downtime', align: 'right', render: (m) => fmtDur(m.minutes) }, { key: 'events', label: 'Downtime events', align: 'right' },
    { key: 'avg', label: 'Avg duration', align: 'right', render: (m) => fmtDur(m.avg) },
    { key: 'flag', label: 'Flag', sortVal: high, render: (m) => (high(m) ? <span className="text-amber-700 font-medium">High downtime</span> : '—') },
  ];
  const asVal = (k) => machines.map((m) => ({ name: m.line, value: m[k] ?? 0 }));
  return (
    <div className="space-y-5">
      <Notice>In this workbook each machine is a production line (the <code>machine</code> column holds Line 1–3), so machine and line views are identical. A machine is flagged when its downtime is at least {T.lineHigh}× the average of the other machines.</Notice>
      <KPIGrid>
        <KPI icon={Wrench} label="Highest Downtime Machine" value={withDown[0]?.line ?? '—'} sub={withDown[0] && fmtDur(withDown[0].minutes)} status={withDown[0] && high(withDown[0]) ? 'warn' : undefined} />
        <KPI icon={Hash} label="Downtime Frequency" value={fmtNum(down.events)} unit="events" />
        <KPI icon={Timer} label="Avg Downtime Duration" value={fmtDur(down.avg)} sub="per event" />
      </KPIGrid>
      <Grid>
        <ChartCard title="Production by Machine" empty={!machines.length}><BarC data={asVal('output')} fmt={sqm} /></ChartCard>
        <ChartCard title="Downtime by Machine" subtitle="Hours" empty={!machines.length}><BarC data={asVal('minutes').map((x) => ({ ...x, value: x.value / 60 }))} fmt={fmtH} color={C.amber} /></ChartCard>
        <ChartCard title="Downtime Event Frequency" empty={!machines.length}><BarC data={asVal('events')} fmt={(v) => fmtNum(v)} color={C.navy} /></ChartCard>
        <ChartCard title="Average Downtime Duration" subtitle="Minutes per event" empty={!machines.length}><BarC data={asVal('avg')} fmt={(v) => `${fmtNum(v, 1)} min`} color={C.palette[4]} /></ChartCard>
      </Grid>
      <Notice>OEE unavailable – required inputs not provided.</Notice>
      <InsightList items={byCat(ins, 'downtime').slice(0, 4)} title="Machine Insights" />
      <DataTable title="Machine Performance" columns={cols} rows={machines} searchable={false} rowClass={(m) => (high(m) ? 'bg-amber-50' : '')} />
    </div>
  );
}

export function Downtime({ s, f, ins, costs }) {
  const { down } = s;
  const cols = [
    { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'line', label: 'Line / Machine' }, { key: 'shift', label: 'Shift' },
    { key: 'reason', label: 'Category / Reason' }, { key: 'orderId', label: 'Order' },
    { key: 'minutes', label: 'Duration', align: 'right', render: (r) => fmtDur(r.minutes), text: (r) => `${r.minutes}` },
  ].filter((c) => has(f.downtime, c.key));
  const topMin = down.byReason[0]?.name;
  return (
    <div className="space-y-5">
      <KPIGrid>
        <KPI icon={Clock} label="Total Downtime" value={fmtNum(down.minutes / 60, 1)} unit="hours" sub={fmtDur(down.minutes)} />
        <KPI icon={Hash} label="Downtime Events" value={fmtNum(down.events)} />
        <KPI icon={Timer} label="Avg Downtime per Event" value={fmtDur(down.avg)} />
        <KPI icon={AlertTriangle} label="Highest Downtime Category" value={topMin ?? '—'} sub={down.byReason[0] && `${fmtDur(down.byReason[0].value)} · ${down.byReason[0].count} events`} />
        {costs?.downCost != null && <KPI icon={IndianRupee} label="Est. Running Cost of Downtime" value={`₹${fmtNum(costs.downCost)}`} sub="Estimate: downtime minutes × assumed ₹/machine-minute (Cost_Assumptions)" />}
      </KPIGrid>
      <Grid>
        <ChartCard title="Downtime by Category" subtitle="Hours" empty={!down.byReason.length}><Donut data={hrs(down.byReason)} fmt={fmtH} /></ChartCard>
        <ChartCard title="Downtime by Production Line / Machine" subtitle="Hours (machine = line in this workbook)" empty={!down.byLine.length}><BarC data={hrs(down.byLine)} fmt={fmtH} color={C.amber} /></ChartCard>
        {has(f.downtime, 'shift') && <ChartCard title="Downtime by Shift" subtitle="Hours" empty={!down.byShift.length}><BarC data={hrs(down.byShift)} fmt={fmtH} color={C.navy} /></ChartCard>}
        <ChartCard title="Downtime by Weekday" subtitle="Hours" empty={!down.byWeekday.length}><BarC data={hrs(down.byWeekday)} fmt={fmtH} color={C.palette[4]} /></ChartCard>
      </Grid>
      <ChartCard title="Daily Downtime Trend" subtitle="Hours per day" empty={!down.daily.length}><AreaC data={down.daily.map((d) => ({ name: d.name, Downtime: d.value / 60 }))} series={[{ key: 'Downtime', color: C.amber }]} fmt={fmtH} /></ChartCard>
      <InsightList items={byCat(ins, 'downtime')} title="Downtime Insights" />
      <DataTable title="Downtime Records" columns={cols} rows={f.downtime} rowClass={(r) => (r.reason === topMin ? 'bg-amber-50/60' : '')} />
      <p className="text-xs text-slate-500">Rows in the largest downtime category ({topMin ?? '—'}) are highlighted.</p>
    </div>
  );
}

export function Waste({ s, f, ins, costs }) {
  const { prod } = s;
  return (
    <div className="space-y-5">
      <KPIGrid>
        <KPI icon={Trash2} label="Total Recorded Waste" value={fmtNum(prod.waste)} unit="kg" />
        <KPI icon={Hash} label="Avg Waste per Production Record" value={fmtNum(prod.avgWaste, 1)} unit="kg" sub={`${fmtNum(prod.wasteRecords)} records with waste values`} />
        <KPI icon={Factory} label="Highest Waste Line" value={prod.wasteByLine[0]?.name ?? '—'} sub={prod.wasteByLine[0] && kg(prod.wasteByLine[0].value)} />
        <KPI icon={Layers} label="Highest Waste Shift" value={prod.wasteByShift[0]?.name ?? '—'} sub={prod.wasteByShift[0] && kg(prod.wasteByShift[0].value)} />
        {costs?.paperCost != null && <KPI icon={IndianRupee} label="Est. Paper Cost of Waste" value={`₹${fmtNum(costs.paperCost)}`} sub="Estimate: waste kg × assumed ₹/kg paper rate (Cost_Assumptions)" />}
      </KPIGrid>
      <Notice>Waste percentage unavailable – total material input is not provided.</Notice>
      <Grid>
        <ChartCard title="Waste by Production Line" empty={!prod.wasteByLine.length}><BarC data={prod.wasteByLine} fmt={kg} color={C.amber} /></ChartCard>
        <ChartCard title="Waste by Shift" empty={!prod.wasteByShift.length}><BarC data={prod.wasteByShift} fmt={kg} color={C.amber} /></ChartCard>
        <ChartCard title="Waste Comparison Across Shifts" subtitle="Average kg per production record" empty={!prod.wasteAvgByShift.length}><BarC data={prod.wasteAvgByShift} fmt={(v) => `${fmtNum(v, 1)} kg`} color={C.red} /></ChartCard>
        {has(f.production, 'boxType') && <ChartCard title="Waste by Box Type" empty={!prod.wasteByBox.length}><BarC data={prod.wasteByBox} fmt={kg} color={C.palette[4]} /></ChartCard>}
      </Grid>
      <ChartCard title="Daily Waste Trend" subtitle="kg per day" empty={!prod.wasteDaily.length}><AreaC data={dailySeries(prod.wasteDaily, 'Waste')} series={[{ key: 'Waste', color: C.amber }]} fmt={kg} /></ChartCard>
      <InsightList items={byCat(ins, 'waste')} title="Waste Insights" />
    </div>
  );
}

export function Orders({ s, f, ins }) {
  const { orders } = s;
  const cols = [
    { key: 'id', label: 'Order ID' }, { key: 'customer', label: 'Customer' }, { key: 'boxType', label: 'Product (box type)' },
    { key: 'orderDate', label: 'Order date', render: (o) => fmtDate(o.orderDate) }, { key: 'dueDate', label: 'Due date', render: (o) => fmtDate(o.dueDate) },
    { key: 'dispatch', label: 'Actual dispatch', render: (o) => fmtDate(o.dispatch) }, { key: 'qty', label: 'Quantity', align: 'right', render: (o) => fmtNum(o.qty) },
    { key: 'delayDays', label: 'Delay (days)', align: 'right', render: (o) => (o.delayDays == null ? '—' : o.delayDays) },
    { key: 'status', label: 'Status', render: (o) => <span className="font-medium" style={{ color: STATUS_COLOR[o.status] }}>{o.status}</span> },
  ].filter((c) => has(f.orders, c.key));
  const stack = [{ key: 'On-time', color: C.green }, { key: 'Delayed', color: C.red }];
  return (
    <div className="space-y-5">
      <Notice>Delivery status compares <b>actual dispatch date</b> with <b>due date</b> (dispatch on or before due = on-time). On-time % uses dispatched orders only. Orders are filtered by order date.</Notice>
      <KPIGrid>
        <KPI icon={ClipboardList} label="Total Orders" value={fmtNum(orders.total)} />
        <KPI icon={CheckCircle2} label="On-Time Orders" value={fmtNum(orders.onTime)} />
        <KPI icon={AlertTriangle} label="Delayed Orders" value={fmtNum(orders.delayed)} status={orders.delayed ? 'warn' : undefined} sub={orders.delayed ? `Max delay ${orders.maxDelay} day(s)` : undefined} />
        <KPI icon={Truck} label="On-Time Delivery" value={fmtPct(orders.otd)} sub={`${orders.dispatched} dispatched orders${orders.open ? ` · ${orders.open} not dispatched` : ''}`} />
      </KPIGrid>
      <Grid>
        <ChartCard title="Orders by Delivery Status" empty={!orders.byStatus.length}><Donut data={orders.byStatus} colorMap={STATUS_COLOR} /></ChartCard>
        <ChartCard title="Delivery Performance by Due Date" subtitle="Dispatched orders per due date" empty={!orders.timeline.length}><BarC data={orders.timeline} stack={stack} xFmt={fmtShort} fmt={(v) => fmtNum(v)} /></ChartCard>
        {has(f.orders, 'customer') && <ChartCard title="Orders by Customer" empty={!orders.byCustomer.length}><BarC data={orders.byCustomer} horizontal fmt={(v) => fmtNum(v)} /></ChartCard>}
        {has(f.orders, 'boxType') && <ChartCard title="Orders by Product (Box Type)" empty={!orders.byBox.length}><BarC data={orders.byBox} fmt={(v) => fmtNum(v)} color={C.navy} /></ChartCard>}
      </Grid>
      <DataTable title="Orders" columns={cols} rows={f.orders} rowClass={(o) => (o.status === 'Delayed' ? 'bg-red-50' : '')} />
      <InsightList items={byCat(ins, 'orders')} title="Order Insights" />
    </div>
  );
}

export function Explorer({ d }) {
  const names = ['Orders', 'Production_Log', 'Downtime_Log', 'Cost_Assumptions'].filter((n) => d.raw[n]);
  const [sheet, setSheet] = useState(names[0]);
  const sh = d.raw[sheet] || d.raw[names[0]];
  const cols = useMemo(() => (sh ? sh.columns.map((c) => ({ key: c, label: c, render: (r) => fmtCell(c, r[c]), text: (r) => fmtCell(c, r[c]) })) : []), [sh]);
  if (!sh) return <Empty text="No sheets found in the workbook" />;
  return (
    <div className="space-y-4">
      <div className="card p-3 flex flex-wrap gap-3 items-center">
        <label className="text-xs text-slate-500 flex flex-col gap-1">Sheet<select className="sel" value={sheet} onChange={(e) => setSheet(e.target.value)}>{names.map((n) => <option key={n}>{n}</option>)}</select></label>
        <div className="text-sm text-slate-600"><b>{fmtNum(sh.rows.length)}</b> rows · <b>{sh.columns.length}</b> columns</div>
        <div className="flex flex-wrap gap-1.5">{sh.columns.map((c) => <span key={c} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{c}</span>)}</div>
      </div>
      <DataTable key={sheet} title={sheet} columns={cols} rows={sh.rows} pageSize={15} />
    </div>
  );
}
