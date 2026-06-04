"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  // Date and Search states
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  
  // Data states
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Loading states
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  // Sync state after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch summary metrics
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch(`/api/summary?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (!data.error) {
        setSummary(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSummary(false);
    }
  }, [startDate, endDate]);

  // Fetch detailed invoices table
  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetch(`/api/invoices?startDate=${startDate}&endDate=${endDate}&search=${activeSearch}&limit=${limit}&offset=${offset}`);
      const data = await res.json();
      if (!data.error) {
        setInvoices(data.invoices || []);
        setTotalInvoices(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInvoices(false);
    }
  }, [startDate, endDate, activeSearch, offset]);

  // Fetch on date range changes or search trigger
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setOffset(0);
    setActiveSearch(search);
  };

  const handleResetFilters = () => {
    setStartDate('2024-01-01');
    setEndDate(new Date().toISOString().slice(0, 10));
    setSearch('');
    setActiveSearch('');
    setOffset(0);
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatNumber = (val) => {
    if (val === undefined || val === null) return '0';
    return new Intl.NumberFormat('en-IN').format(val);
  };

  // Safe KPI variables
  const kpi = summary?.kpi || {
    total_revenue: 0,
    total_labour: 0,
    total_spares: 0,
    total_invoices: 0,
    total_wa: 0,
    total_wb: 0,
    total_vas: 0
  };

  const lastSync = summary?.lastSync;
  const trends = summary?.trends || [];
  const advisors = summary?.advisors || [];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <h1>TATA WORKSHOP ANALYTICS</h1>
          <p>Passenger & Electric Vehicle Integrated Operations Dashboard</p>
        </div>
        {lastSync && (
          <div className="sync-badge">
            <span className="sync-dot"></span>
            <span>
              Last Sync: {new Date(lastSync.Last_Run.value || lastSync.Last_Run).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </span>
            <span className={`badge ${lastSync.Status === 'SUCCESS' ? 'success' : 'danger'}`} style={{ marginLeft: '10px' }}>
              {lastSync.Status}
            </span>
          </div>
        )}
      </header>

      {/* Dynamic Filter Controls */}
      <section className="filter-bar">
        <div className="filter-group">
          <label>Start Date</label>
          <input 
            type="date" 
            className="filter-input" 
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setOffset(0); }}
          />
        </div>
        <div className="filter-group">
          <label>End Date</label>
          <input 
            type="date" 
            className="filter-input" 
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setOffset(0); }}
          />
        </div>
        
        <form onSubmit={handleSearchSubmit} className="filter-group" style={{ flex: 2 }}>
          <label>Search Explorer</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              className="filter-input" 
              style={{ flex: 1 }}
              placeholder="Search by Invoice No, Registration No, Chassis, Advisor..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="filter-button">Search</button>
          </div>
        </form>

        <button onClick={handleResetFilters} className="filter-button secondary">
          Reset Filters
        </button>
      </section>

      {/* KPI scorecard dashboard grid */}
      <section className="kpi-grid">
        <div className="kpi-card" style={{ '--accent-color': 'var(--primary)' }}>
          <div className="kpi-header">
            <span className="kpi-title">Total Revenue</span>
            <span className="badge success">Labour + Spares</span>
          </div>
          <div className="kpi-value">{loadingSummary ? 'Loading...' : formatCurrency(kpi.total_revenue)}</div>
          <div className="kpi-footer">Processed over {formatNumber(kpi.total_invoices)} job cards</div>
        </div>

        <div className="kpi-card" style={{ '--accent-color': 'var(--cyan)' }}>
          <div className="kpi-header">
            <span className="kpi-title">Labour Amount</span>
            <span className="badge info">Services</span>
          </div>
          <div className="kpi-value">{loadingSummary ? 'Loading...' : formatCurrency(kpi.total_labour)}</div>
          <div className="kpi-footer">
            {kpi.total_revenue > 0 
              ? `${Math.round((kpi.total_labour / kpi.total_revenue) * 100)}% of overall workshop earnings` 
              : '0% split'}
          </div>
        </div>

        <div className="kpi-card" style={{ '--accent-color': 'var(--amber)' }}>
          <div className="kpi-header">
            <span className="kpi-title">Spare Sale</span>
            <span className="badge warning">Spares</span>
          </div>
          <div className="kpi-value">{loadingSummary ? 'Loading...' : formatCurrency(kpi.total_spares)}</div>
          <div className="kpi-footer">
            {kpi.total_revenue > 0 
              ? `${Math.round((kpi.total_spares / kpi.total_revenue) * 100)}% of overall workshop earnings` 
              : '0% split'}
          </div>
        </div>

        <div className="kpi-card" style={{ '--accent-color': 'var(--emerald)' }}>
          <div className="kpi-header">
            <span className="kpi-title">Wheel Services</span>
            <span className="badge success">WA & WB</span>
          </div>
          <div className="kpi-value">
            {loadingSummary ? 'Loading...' : `${formatNumber(kpi.total_wa)} / ${formatNumber(kpi.total_wb)}`}
          </div>
          <div className="kpi-footer">Total operations count (Alignment/Balancing)</div>
        </div>
      </section>

      {/* Main Charts & Leaderboard Row */}
      <section className="dashboard-row">
        
        {/* Trend Area Chart */}
        <div className="chart-card">
          <div className="chart-title">
            Monthly Earnings Trend 
            <span>Labour vs Spares (INR)</span>
          </div>
          <div className="chart-wrapper">
            {loadingSummary ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Fetching trend charts...
              </div>
            ) : trends.length === 0 ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                No records found for specified dates.
              </div>
            ) : mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLabour" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSpares" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month_label" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={(tick) => `₹${tick / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff' }} 
                    formatter={(val) => [formatCurrency(val), '']}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" name="Labour" dataKey="labour_revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorLabour)" />
                  <Area type="monotone" name="Spares" dataKey="spares_revenue" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorSpares)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Top Service Advisors leaderboard list */}
        <div className="chart-card">
          <div className="chart-title">
            Top Service Advisors
            <span>Revenue Leaderboard</span>
          </div>
          <div className="leaderboard-list">
            {loadingSummary ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Calculating performance rankings...
              </div>
            ) : advisors.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No active advisor logs found.
              </div>
            ) : (
              advisors.map((adv, idx) => (
                <div key={adv.advisor_name} className="leaderboard-item">
                  <div className="leaderboard-rank">{idx + 1}</div>
                  <div className="leaderboard-info">
                    <div className="leaderboard-name">{adv.advisor_name.toLowerCase()}</div>
                    <div className="leaderboard-sub">{formatNumber(adv.jc_count)} job cards processed</div>
                  </div>
                  <div className="leaderboard-metrics">
                    <div className="leaderboard-val">{formatCurrency(adv.total_revenue)}</div>
                    <div className="leaderboard-sub">Avg Ticket: {formatCurrency(adv.avg_ticket)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Detailed Table Section */}
      <section className="table-section">
        <div className="table-header">
          <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.25rem', fontWeight: 600 }}>
            Workshop Invoices Explorer
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing {formatNumber(offset + 1)} - {formatNumber(Math.min(offset + limit, totalInvoices))} of {formatNumber(totalInvoices)} records
          </span>
        </div>

        <div className="table-wrapper">
          {loadingInvoices ? (
            <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Streaming database rows...
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No invoices match your selected search or date range.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Invoice Date</th>
                  <th>Invoice Number</th>
                  <th>Registration No</th>
                  <th>Advisor</th>
                  <th style={{ textAlign: 'right' }}>Labour Amount</th>
                  <th style={{ textAlign: 'right' }}>Spare Sale</th>
                  <th style={{ textAlign: 'right' }}>Total Val</th>
                  <th>Wheel Services (WA / WB)</th>
                  <th>Service Type</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const dateStr = inv.invoice_date?.value || inv.invoice_date || 'N/A';
                  const totalAmt = (inv.labour_amount || 0) + (inv.spare_sale || 0);
                  
                  // Category class resolvers
                  let catClass = 'info';
                  if (inv.vas_wa_wb === 'WHEEL ALIGNMENT') catClass = 'info';
                  else if (inv.vas_wa_wb === 'WHEEL BALANCING') catClass = 'warning';
                  else if (inv.vas_wa_wb === 'VAS') catClass = 'success';

                  return (
                    <tr key={inv.invoice_number}>
                      <td style={{ fontFamily: 'monospace' }}>{dateStr}</td>
                      <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{inv.invoice_number}</td>
                      <td style={{ fontFamily: 'monospace' }}>{inv.reg_no || '-'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{inv.advisor ? inv.advisor.toLowerCase() : '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: '500' }}>{formatCurrency(inv.labour_amount)}</td>
                      <td style={{ textAlign: 'right', fontWeight: '500' }}>{formatCurrency(inv.spare_sale)}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--cyan)' }}>{formatCurrency(totalAmt)}</td>
                      <td>
                        {inv.wa_count > 0 || inv.wb_count > 0 ? (
                          <span style={{ fontSize: '0.8rem' }}>
                            {inv.wa_count > 0 ? `WA: ${inv.wa_count} (${formatCurrency(inv.wa_amount)})` : ''}
                            {inv.wa_count > 0 && inv.wb_count > 0 ? ' | ' : ''}
                            {inv.wb_count > 0 ? `WB: ${inv.wb_count} (${formatCurrency(inv.wb_amount)})` : ''}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td>
                        {inv.vas_wa_wb ? (
                          <span className={`badge ${catClass}`}>{inv.vas_wa_wb}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td>
                        {inv.available ? (
                          <span className="badge success">{inv.available}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controller */}
        <div className="pagination">
          <div>
            Records per page: <strong>{limit}</strong>
          </div>
          <div className="pagination-buttons">
            <button 
              className="pagination-btn"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              Previous
            </button>
            <button 
              className="pagination-btn"
              disabled={offset + limit >= totalInvoices}
              onClick={() => setOffset(offset + limit)}
            >
              Next
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
