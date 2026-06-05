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
  
  // Navigation
  const [activeTab, setActiveTab] = useState('overview');

  // Date and Search states
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Overview states
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  // Forensics states
  const [forensicsSummary, setForensicsSummary] = useState(null);
  const [forensicsAdvisors, setForensicsAdvisors] = useState([]);
  const [flaggedInvoices, setFlaggedInvoices] = useState([]);
  const [totalFlagged, setTotalFlagged] = useState(0);
  const [forensicsOffset, setForensicsOffset] = useState(0);
  const [loadingForensics, setLoadingForensics] = useState(false);

  // Open RO states
  const [openRos, setOpenRos] = useState([]);
  const [openRosDelays, setOpenRosDelays] = useState([]);
  const [openRosAgeing, setOpenRosAgeing] = useState([]);
  const [totalOpenRos, setTotalOpenRos] = useState(0);
  const [openRoOffset, setOpenRoOffset] = useState(0);
  const [openRoSearch, setOpenRoSearch] = useState('');
  const [openRoActiveSearch, setOpenRoActiveSearch] = useState('');
  const [loadingOpenRos, setLoadingOpenRos] = useState(false);

  // Programs states
  const [programs, setPrograms] = useState(null);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  // Sync state after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch summary metrics (Overview Tab)
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

  // Fetch detailed invoices table (Overview Tab)
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

  // Fetch forensics metrics
  const fetchForensics = useCallback(async () => {
    setLoadingForensics(true);
    try {
      const res = await fetch(`/api/forensics?startDate=${startDate}&endDate=${endDate}&limit=${limit}&offset=${forensicsOffset}`);
      const data = await res.json();
      if (!data.error) {
        setForensicsSummary(data.summary || null);
        setForensicsAdvisors(data.advisors || []);
        setFlaggedInvoices(data.flaggedInvoices || []);
        setTotalFlagged(data.summary?.total_flagged || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingForensics(false);
    }
  }, [startDate, endDate, forensicsOffset]);

  // Fetch Open RO backlog metrics
  const fetchOpenRos = useCallback(async () => {
    setLoadingOpenRos(true);
    try {
      const res = await fetch(`/api/open-ro?limit=${limit}&offset=${openRoOffset}&search=${openRoActiveSearch}`);
      const data = await res.json();
      if (!data.error) {
        setOpenRos(data.openRos || []);
        setOpenRosDelays(data.delays || []);
        setOpenRosAgeing(data.ageing || []);
        setTotalOpenRos(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOpenRos(false);
    }
  }, [openRoOffset, openRoActiveSearch]);

  // Fetch Programs metrics
  const fetchPrograms = useCallback(async () => {
    setLoadingPrograms(true);
    try {
      const res = await fetch(`/api/programs?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (!data.error) {
        setPrograms(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPrograms(false);
    }
  }, [startDate, endDate]);

  // Fetch on Tab changes or criteria updates
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchSummary();
      fetchInvoices();
    } else if (activeTab === 'forensics') {
      fetchForensics();
    } else if (activeTab === 'open_ro') {
      fetchOpenRos();
    } else if (activeTab === 'programs') {
      fetchPrograms();
    }
  }, [activeTab, fetchSummary, fetchInvoices, fetchForensics, fetchOpenRos, fetchPrograms]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setOffset(0);
    setActiveSearch(search);
  };

  const handleOpenRoSearchSubmit = (e) => {
    e.preventDefault();
    setOpenRoOffset(0);
    setOpenRoActiveSearch(openRoSearch);
  };

  const handleResetFilters = () => {
    setStartDate('2024-01-01');
    setEndDate(new Date().toISOString().slice(0, 10));
    setSearch('');
    setActiveSearch('');
    setOffset(0);
    setForensicsOffset(0);
    setOpenRoSearch('');
    setOpenRoActiveSearch('');
    setOpenRoOffset(0);
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

      {/* Tabs Selector Navigation */}
      <nav className="tabs-nav">
        <button 
          onClick={() => setActiveTab('overview')} 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
        >
          Workshop Overview
        </button>
        <button 
          onClick={() => setActiveTab('forensics')} 
          className={`tab-btn ${activeTab === 'forensics' ? 'active' : ''}`}
        >
          Forensic Audit & Risk
        </button>
        <button 
          onClick={() => setActiveTab('open_ro')} 
          className={`tab-btn ${activeTab === 'open_ro' ? 'active' : ''}`}
        >
          Open RO Explorer
        </button>
        <button 
          onClick={() => setActiveTab('programs')} 
          className={`tab-btn ${activeTab === 'programs' ? 'active' : ''}`}
        >
          Programs & Contracts
        </button>
      </nav>

      {/* Filter Controls (Available for all tabs, though Open RO relies on backlog query only) */}
      <section className="filter-bar">
        <div className="filter-group">
          <label>Start Date</label>
          <input 
            type="date" 
            className="filter-input" 
            value={startDate}
            onChange={(e) => { 
              setStartDate(e.target.value); 
              setOffset(0); 
              setForensicsOffset(0);
            }}
            disabled={activeTab === 'open_ro'}
          />
        </div>
        <div className="filter-group">
          <label>End Date</label>
          <input 
            type="date" 
            className="filter-input" 
            value={endDate}
            onChange={(e) => { 
              setEndDate(e.target.value); 
              setOffset(0); 
              setForensicsOffset(0);
            }}
            disabled={activeTab === 'open_ro'}
          />
        </div>

        {activeTab === 'overview' && (
          <form onSubmit={handleSearchSubmit} className="filter-group" style={{ flex: 2 }}>
            <label>Search Overview Invoices</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="filter-input" 
                style={{ flex: 1 }}
                placeholder="Search by Invoice No, Registration, Chassis, Advisor..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="filter-button">Search</button>
            </div>
          </form>
        )}

        {activeTab === 'open_ro' && (
          <form onSubmit={handleOpenRoSearchSubmit} className="filter-group" style={{ flex: 2 }}>
            <label>Search Open Repair Orders</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="filter-input" 
                style={{ flex: 1 }}
                placeholder="Search by JC Number, Chassis, Registration, Model, Delay Reason..." 
                value={openRoSearch}
                onChange={(e) => setOpenRoSearch(e.target.value)}
              />
              <button type="submit" className="filter-button">Search</button>
            </div>
          </form>
        )}

        {activeTab !== 'overview' && activeTab !== 'open_ro' && (
          <div style={{ flex: 2 }}></div>
        )}
        
        <button onClick={handleResetFilters} className="filter-button secondary">
          Reset Filters
        </button>
      </section>

      {/* -------------------- TAB 1: WORKSHOP OVERVIEW -------------------- */}
      {activeTab === 'overview' && (
        <>
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
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const dateStr = inv.invoice_date?.value || inv.invoice_date || 'N/A';
                      const totalAmt = (inv.labour_amount || 0) + (inv.spare_sale || 0);
                      
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
        </>
      )}

      {/* -------------------- TAB 2: FORENSIC AUDIT & RISK -------------------- */}
      {activeTab === 'forensics' && (
        <>
          {/* Global Forensics KPI Cards */}
          <section className="kpi-grid">
            <div className="kpi-card" style={{ '--accent-color': 'var(--primary)' }}>
              <div className="kpi-header">
                <span className="kpi-title">Average Advisor Score</span>
                <span className="badge info">Global Quality</span>
              </div>
              <div className="kpi-value">
                {loadingForensics ? 'Loading...' : `${forensicsSummary?.avg_global_score || 0} / 100`}
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${forensicsSummary?.avg_global_score || 0}%`,
                    background: (forensicsSummary?.avg_global_score || 0) >= 85 ? 'var(--emerald)' : (forensicsSummary?.avg_global_score || 0) >= 70 ? 'var(--amber)' : 'var(--crimson)'
                  }}
                />
              </div>
              <div className="kpi-footer" style={{ marginTop: '8px' }}>
                Based on {formatNumber(forensicsSummary?.total_checked || 0)} invoices analyzed
              </div>
            </div>

            <div className="kpi-card" style={{ '--accent-color': 'var(--crimson)' }}>
              <div className="kpi-header">
                <span className="kpi-title">Rework Alerts</span>
                <span className="badge danger">Repeat Visit &lt; 30d</span>
              </div>
              <div className="kpi-value">
                {loadingForensics ? 'Loading...' : formatNumber(forensicsSummary?.total_rework)}
              </div>
              <div className="kpi-footer">Potential quality or diagnostic rework issues</div>
            </div>

            <div className="kpi-card" style={{ '--accent-color': 'var(--amber)' }}>
              <div className="kpi-header">
                <span className="kpi-title">Revenue Leakage</span>
                <span className="badge warning">Spares &gt; 1k, Labor = 0</span>
              </div>
              <div className="kpi-value">
                {loadingForensics ? 'Loading...' : formatNumber(forensicsSummary?.total_leak_alerts)}
              </div>
              <div className="kpi-footer">Free/unbilled labor on major parts replacements</div>
            </div>

            <div className="kpi-card" style={{ '--accent-color': 'var(--cyan)' }}>
              <div className="kpi-header">
                <span className="kpi-title">Excessive Discounts</span>
                <span className="badge info">Disc &gt; 20%</span>
              </div>
              <div className="kpi-value">
                {loadingForensics ? 'Loading...' : formatNumber(forensicsSummary?.total_discount_alerts)}
              </div>
              <div className="kpi-footer">Job discounts exceeding 20% authorization threshold</div>
            </div>
          </section>

          {/* Leaderboard and Flagged Invoices Row */}
          <section className="dashboard-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
            
            {/* Advisor Scoring List */}
            <div className="chart-card">
              <div className="chart-title">
                Advisor Quality Leaderboard
                <span>Rating Scores (High to Low)</span>
              </div>
              <div className="leaderboard-list">
                {loadingForensics ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Running audit analytics...
                  </div>
                ) : forensicsAdvisors.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No advisor scores generated.
                  </div>
                ) : (
                  forensicsAdvisors.map((adv) => {
                    const scoreColor = adv.avg_score >= 85 ? 'var(--emerald)' : adv.avg_score >= 70 ? 'var(--amber)' : 'var(--crimson)';
                    return (
                      <div key={adv.advisor_name} className="leaderboard-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div className="leaderboard-name">{adv.advisor_name.toLowerCase()}</div>
                            <div className="leaderboard-sub">{formatNumber(adv.total_invoices)} invoices audited</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="leaderboard-val" style={{ color: scoreColor }}>{adv.avg_score}</div>
                            <div className="leaderboard-sub">Avg Quality</div>
                          </div>
                        </div>
                        <div className="progress-bar-container" style={{ margin: 0 }}>
                          <div 
                            className="progress-bar-fill" 
                            style={{ 
                              width: `${adv.avg_score}%`,
                              background: scoreColor
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <span>Rework: {adv.rework_count}</span>
                          <span>|</span>
                          <span>Leak: {adv.leak_count}</span>
                          <span>|</span>
                          <span>Discount: {adv.discount_count}</span>
                          <span>|</span>
                          <span>Low Pricing: {adv.low_pricing_count}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Flagged Invoices Table */}
            <div className="chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="chart-title">
                Audit Alerts Registry
                <span>Showing flagged records with quality anomalies</span>
              </div>
              
              <div className="table-wrapper" style={{ flex: 1 }}>
                {loadingForensics ? (
                  <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Retrieving database logs...
                  </div>
                ) : flaggedInvoices.length === 0 ? (
                  <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No audit alerts triggered in selected date range.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Invoice Number</th>
                        <th>Advisor</th>
                        <th style={{ textAlign: 'right' }}>Labour</th>
                        <th style={{ textAlign: 'right' }}>Spares</th>
                        <th style={{ textAlign: 'center' }}>Score</th>
                        <th>Triggered Audit Anomalies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flaggedInvoices.map((inv) => {
                        const dateStr = inv.invoice_date?.value || inv.invoice_date || 'N/A';
                        const scoreColor = inv.advisor_score >= 85 ? 'var(--emerald)' : inv.advisor_score >= 70 ? 'var(--amber)' : 'var(--crimson)';
                        
                        return (
                          <tr key={inv.invoice_number}>
                            <td style={{ fontFamily: 'monospace' }}>{dateStr}</td>
                            <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{inv.invoice_number}</td>
                            <td style={{ textTransform: 'capitalize' }}>{inv.advisor_name ? inv.advisor_name.toLowerCase() : '-'}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(inv.labour_amount)}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(inv.spare_sale)}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: scoreColor }}>{inv.advisor_score}</td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {inv.alert_rework === 1 && <span className="forensics-alert-tag rework">Rework</span>}
                                {inv.alert_leak === 1 && <span className="forensics-alert-tag leak">Leakage</span>}
                                {inv.alert_discount === 1 && <span className="forensics-alert-tag discount">Discount</span>}
                                {(inv.alert_low_lab === 1 || inv.alert_low_part === 1 || inv.alert_low_lab_global === 1 || inv.alert_low_part_global === 1) && (
                                  <span className="forensics-alert-tag low-price">Pricing Anomaly</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Forensics pagination */}
              <div className="pagination">
                <span>
                  Showing {formatNumber(forensicsOffset + 1)} - {formatNumber(Math.min(forensicsOffset + limit, totalFlagged))} of {formatNumber(totalFlagged)} flagged invoices
                </span>
                <div className="pagination-buttons">
                  <button 
                    className="pagination-btn"
                    disabled={forensicsOffset === 0}
                    onClick={() => setForensicsOffset(Math.max(0, forensicsOffset - limit))}
                  >
                    Previous
                  </button>
                  <button 
                    className="pagination-btn"
                    disabled={forensicsOffset + limit >= totalFlagged}
                    onClick={() => setForensicsOffset(forensicsOffset + limit)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* -------------------- TAB 3: OPEN RO EXPLORER -------------------- */}
      {activeTab === 'open_ro' && (
        <>
          {/* Ageing summary cards and delay bars */}
          <section className="dashboard-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            
            {/* Ageing Summary Card */}
            <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="chart-title">
                Open Job Cards Ageing 
                <span>Distribution by bucket</span>
              </div>
              <div className="program-stats-summary" style={{ gap: '20px', flex: 1, alignContent: 'center' }}>
                {openRosAgeing.map((bucket) => {
                  let accent = 'var(--primary)';
                  if (bucket.age_bucket === '>15 Days') accent = 'var(--crimson)';
                  else if (bucket.age_bucket === '8-15 Days') accent = 'var(--amber)';
                  else if (bucket.age_bucket === '5-7 Days') accent = 'var(--cyan)';
                  else accent = 'var(--emerald)';
                  
                  return (
                    <div key={bucket.age_bucket} className="program-stat-box" style={{ borderLeft: `4px solid ${accent}` }}>
                      <div className="program-stat-val" style={{ color: accent }}>{formatNumber(bucket.total_count)}</div>
                      <div className="program-stat-label">{bucket.age_bucket}</div>
                    </div>
                  );
                })}
              </div>
              <div className="kpi-footer" style={{ marginTop: '24px', borderTop: '1px solid var(--border-card)', paddingTop: '16px' }}>
                Total Active Backlog: <strong>{formatNumber(totalOpenRos)} open repair orders</strong>
              </div>
            </div>

            {/* Delay Reasons Bar Charts */}
            <div className="chart-card">
              <div className="chart-title">
                Top Delay Reasons
                <span>Volume breakdown</span>
              </div>
              <div className="delay-bar-list">
                {loadingOpenRos ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Aggregating delay codes...
                  </div>
                ) : openRosDelays.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No delay reasons logged.
                  </div>
                ) : (
                  openRosDelays.slice(0, 5).map((delay) => {
                    const totalCount = totalOpenRos || 1;
                    const percent = (delay.total / totalCount) * 100;
                    return (
                      <div key={delay.delay_reason} className="delay-bar-item">
                        <div className="delay-bar-header">
                          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{delay.delay_reason}</span>
                          <span>
                            <strong>{delay.total} JCs</strong> ({Math.round(percent)}%) | Avg: {delay.avg_days} days
                          </span>
                        </div>
                        <div className="delay-bar-wrapper">
                          <div 
                            className="delay-bar-fill" 
                            style={{ 
                              width: `${percent}%`,
                              background: percent > 30 ? 'var(--crimson)' : percent > 15 ? 'var(--amber)' : 'var(--cyan)'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* Open JCs backlog explorer table */}
          <section className="table-section">
            <div className="table-header">
              <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.25rem', fontWeight: 600 }}>
                Active Backlog Registry (Open ROs)
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Showing {formatNumber(openRoOffset + 1)} - {formatNumber(Math.min(openRoOffset + limit, totalOpenRos))} of {formatNumber(totalOpenRos)} open cases
              </span>
            </div>

            <div className="table-wrapper">
              {loadingOpenRos ? (
                <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading open repair orders...
                </div>
              ) : openRos.length === 0 ? (
                <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No open job cards found.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>JC Number</th>
                      <th>Created Date</th>
                      <th>Model</th>
                      <th>Registration</th>
                      <th>Division</th>
                      <th>Service Type</th>
                      <th>Open Days</th>
                      <th>Delay Reason</th>
                      <th>Action Taken</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openRos.map((ro) => {
                      let daysClass = 'success';
                      if (ro.open_days > 15) daysClass = 'danger';
                      else if (ro.open_days > 7) daysClass = 'warning';
                      else if (ro.open_days > 4) daysClass = 'info';

                      return (
                        <tr key={ro.jc_number}>
                          <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{ro.jc_number}</td>
                          <td style={{ fontFamily: 'monospace' }}>{ro.created_date}</td>
                          <td>{ro.model || '-'}</td>
                          <td style={{ fontFamily: 'monospace' }}>{ro.reg_no || '-'}</td>
                          <td>{ro.division}</td>
                          <td>{ro.service_type}</td>
                          <td>
                            <span className={`badge ${daysClass}`}>{ro.open_days} Days</span>
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ro.delay_reason}>
                            {ro.delay_reason}
                          </td>
                          <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ro.action_taken}>
                            {ro.action_taken}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Open RO pagination */}
            <div className="pagination">
              <span>Records per page: <strong>{limit}</strong></span>
              <div className="pagination-buttons">
                <button 
                  className="pagination-btn"
                  disabled={openRoOffset === 0}
                  onClick={() => setOpenRoOffset(Math.max(0, openRoOffset - limit))}
                >
                  Previous
                </button>
                <button 
                  className="pagination-btn"
                  disabled={openRoOffset + limit >= totalOpenRos}
                  onClick={() => setOpenRoOffset(openRoOffset + limit)}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* -------------------- TAB 4: PROGRAMS & CONTRACTS -------------------- */}
      {activeTab === 'programs' && (
        <section className="programs-grid">
          
          {/* Column 1: Memberships */}
          <div className="program-column-card">
            <div className="program-card-header">
              <h2>24x7 Roadside Memberships</h2>
              <span className="badge success">memberships_detailed1</span>
            </div>
            
            <div className="program-stats-summary">
              <div className="program-stat-box">
                <div className="program-stat-val" style={{ color: 'var(--primary)' }}>
                  {loadingPrograms ? '...' : formatNumber(programs?.memberships?.summary.reduce((a, b) => a + b.total_count, 0))}
                </div>
                <div className="program-stat-label">Total Sold</div>
              </div>
              <div className="program-stat-box">
                <div className="program-stat-val" style={{ color: 'var(--emerald)' }}>
                  {loadingPrograms ? '...' : formatNumber(programs?.memberships?.summary.reduce((a, b) => a + b.active_count, 0))}
                </div>
                <div className="program-stat-label">Active Plans</div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>
                Recent Sales Registry
              </h3>
              <div className="table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {loadingPrograms ? (
                  <div style={{ padding: '20px 0', textAlign: 'center' }}>Loading...</div>
                ) : !programs?.memberships?.recent || programs.memberships.recent.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No records in range</div>
                ) : (
                  <table style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Program</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programs.memberships.recent.map((m, idx) => (
                        <tr key={idx}>
                          <td>{m.start_date?.value || m.start_date || '-'}</td>
                          <td title={m.program_name} style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.program_name}
                          </td>
                          <td>
                            <span className={`badge ${m.status === 'Active' ? 'success' : 'warning'}`} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>
                              {m.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: AMC Contracts */}
          <div className="program-column-card">
            <div className="program-card-header">
              <h2>Annual Maintenance (AMC)</h2>
              <span className="badge success">Detail_AMC_Report</span>
            </div>
            
            <div className="program-stats-summary">
              <div className="program-stat-box">
                <div className="program-stat-val" style={{ color: 'var(--cyan)' }}>
                  {loadingPrograms ? '...' : formatNumber(programs?.amc?.summary.reduce((a, b) => a + b.total_contracts, 0))}
                </div>
                <div className="program-stat-label">Total Contracts</div>
              </div>
              <div className="program-stat-box">
                <div className="program-stat-val" style={{ color: 'var(--emerald)' }}>
                  {loadingPrograms ? '...' : formatCurrency(programs?.amc?.summary.reduce((a, b) => a + b.total_revenue, 0))}
                </div>
                <div className="program-stat-label">Collected Amt</div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>
                Recent AMC Registry
              </h3>
              <div className="table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {loadingPrograms ? (
                  <div style={{ padding: '20px 0', textAlign: 'center' }}>Loading...</div>
                ) : !programs?.amc?.recent || programs.amc.recent.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No records in range</div>
                ) : (
                  <table style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Model</th>
                        <th style={{ textAlign: 'right' }}>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programs.amc.recent.map((amc, idx) => (
                        <tr key={idx}>
                          <td>{amc.start_date?.value || amc.start_date || '-'}</td>
                          <td>{amc.model || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatCurrency(amc.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Extended Warranty */}
          <div className="program-column-card">
            <div className="program-card-header">
              <h2>Extended Warranty (EW)</h2>
              <span className="badge success">extended_warranty</span>
            </div>
            
            <div className="program-stats-summary">
              <div className="program-stat-box">
                <div className="program-stat-val" style={{ color: 'var(--amber)' }}>
                  {loadingPrograms ? '...' : formatNumber(programs?.ew?.summary.reduce((a, b) => a + b.total_contracts, 0))}
                </div>
                <div className="program-stat-label">Contracts Issued</div>
              </div>
              <div className="program-stat-box">
                <div className="program-stat-val" style={{ color: 'var(--emerald)' }}>
                  {loadingPrograms ? '...' : formatCurrency(programs?.ew?.summary.reduce((a, b) => a + b.total_revenue, 0))}
                </div>
                <div className="program-stat-label">Price Revenue</div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>
                Recent EW Registry
              </h3>
              <div className="table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {loadingPrograms ? (
                  <div style={{ padding: '20px 0', textAlign: 'center' }}>Loading...</div>
                ) : !programs?.ew?.recent || programs.ew.recent.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No records in range</div>
                ) : (
                  <table style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Product</th>
                        <th style={{ textAlign: 'right' }}>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programs.ew.recent.map((ew, idx) => (
                        <tr key={idx}>
                          <td>{ew.sale_date?.value || ew.sale_date || '-'}</td>
                          <td title={ew.product_name} style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ew.product_name || 'EW Program'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatCurrency(ew.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

        </section>
      )}

    </div>
  );
}
