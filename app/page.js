"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend,
  LineChart,
  Line,
  LabelList,
  ReferenceLine
} from 'recharts';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  // Navigation & UI States
  const [activeSection, setActiveSection] = useState('trends'); // 'trends', 'vas', 'ops'
  const [sidebarActive, setSidebarActive] = useState(false);
  const [theme, setTheme] = useState('standard');
  // Filter dropdown menus state
  const [locMenuOpen, setLocMenuOpen] = useState(false);
  const [servMenuOpen, setServMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [roStatusFilter, setRoStatusFilter] = useState('Open');
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [saMenuOpen, setSaMenuOpen] = useState(false);

  // Global Filter States
  const [selectedLoc, setSelectedLoc] = useState('All Locations');
  const [selectedServiceTypes, setSelectedServiceTypes] = useState([]);
  const [selectedSAs, setSelectedSAs] = useState([]); // array of selected advisors
  
  // Calculate current month start and end dates dynamically
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  
  // Service Type Performance groups expansion state
  const [trendExpandedGroups, setTrendExpandedGroups] = useState({
    'Paid Services': true,
    'Free Services': false,
    'Running Repairs': false,
    'Accidental': false,
    'Others': false
  });

  // Generalized Card Maximize state (holds id of maximized card)
  const [maximizedCard, setMaximizedCard] = useState(null);

  // Dashboard Data State (overview, trends, fy, days)
  const [masterData, setMasterData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null);

  // Overview sub-tab state (Service Type Performance)
  const [currentTrendTab, setCurrentTrendTab] = useState('load'); // load, lab, part, labEff, partEff
  
  // Day-wise Trend sub-tab state
  const [currentTrendMode, setCurrentTrendMode] = useState('load'); // load, lab, part, lab_per, part_per
  const [currentTrendServiceType, setCurrentTrendServiceType] = useState('All');

  // Detailed Workshop Revenue (VAS) state
  const [vasViewMode, setVasViewMode] = useState('type'); // type or advisor
  const [vasTypeMode, setVasTypeMode] = useState('MECH'); // MECH, ACC, BOTH
  const [vasOpenRoMode, setVasOpenRoMode] = useState(false);
  const [vasOpenRoExpandedGroups, setVasOpenRoExpandedGroups] = useState({ 'Accident': true, 'Running Repairs': false, 'Paid Service': false, 'Free Services': false, 'Others': false });
  const [vasExpandedGroups, setVasExpandedGroups] = useState({ 'Paid Services': true, 'Free Services': false, 'Running Repairs': false, 'Accidental': false, 'Others': false });
  const [vasMaximized, setVasMaximized] = useState(false);
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState(null);

  // Workshop Operations (section-ops) state
  const [opsOpenRos, setOpsOpenRos] = useState([]);
  const [opsMemberships, setOpsMemberships] = useState([]);
  const [opsAmc, setOpsAmc] = useState([]);
  const [opsEw, setOpsEw] = useState([]);
  const [opsAmcSummary, setOpsAmcSummary] = useState([]);
  const [opsEwSummary, setOpsEwSummary] = useState([]);
  const [opsRsaSummary, setOpsRsaSummary] = useState([]);
  const [loadingOps, setLoadingOps] = useState(false);

  // Forensic Audit Modal state
  const [perfModalOpen, setPerfModalOpen] = useState(false);
  const [scoringRulesOpen, setScoringRulesOpen] = useState(false);
  const [forensicsSummary, setForensicsSummary] = useState(null);
  const [forensicsAdvisors, setForensicsAdvisors] = useState([]);
  const [flaggedInvoices, setFlaggedInvoices] = useState([]);
  const [loadingForensics, setLoadingForensics] = useState(false);
  
  // Forensic modal filter states
  const [perfSearchReg, setPerfSearchReg] = useState('');
  const [perfFilterLoc, setPerfFilterLoc] = useState('All');
  const [perfFilterType, setPerfFilterType] = useState('All');
  const [perfFilterSA, setPerfFilterSA] = useState('All');
  const [perfFilterAlert, setPerfFilterAlert] = useState('All');
  const [perfFilterModel, setPerfFilterModel] = useState('All');

  // Filter Open ROs by selected location and status
  const filteredOpenRos = useMemo(() => {
    let list = opsOpenRos || [];
    if (selectedLoc && selectedLoc !== 'All Locations') {
      list = list.filter(r => r.division === selectedLoc);
    }
    if (roStatusFilter && roStatusFilter !== 'All') {
      list = list.filter(r => {
        const s = (r.status || '').toLowerCase();
        if (roStatusFilter === 'Open') {
          return !s.includes('close') && !s.includes('invoice') && !s.includes('cancel') && !s.includes('new');
        } else if (roStatusFilter === 'Closed') {
          return s.includes('close') || s.includes('invoice') || s.includes('new');
        }
        return true;
      });
    }
    return list;
  }, [opsOpenRos, selectedLoc, roStatusFilter]);
  
  const aggregatedOpenRo = useMemo(() => {
    if (!Array.isArray(filteredOpenRos) || filteredOpenRos.length === 0) return { byType: {}, byReason: [], totalRow: null, reasonTotalRow: null };

    const byType = {};
    const byReason = {};

    let gTotal = { count: 0, d0_4: 0, d5_7: 0, d8_15: 0, d15_plus: 0, totalDays: 0 };
    let rTotal = { mech: 0, acc: 0, d0_4: 0, d5_7: 0, d8_15: 0, d15_plus: 0, totalDays: 0 };

    filteredOpenRos.forEach(ro => {
      if (!ro) return;
      // Clean and normalize
      let rawType = ro.service_type || 'Others';
      let typeStr = String(rawType).toLowerCase();
      let type = 'Others';
      if (typeStr.includes('accident') || typeStr === 'acc') type = 'Accident';
      else if (typeStr.includes('free')) type = 'Free Services';
      else if (typeStr.includes('paid')) type = 'Paid Service';
      else if (typeStr.includes('running')) type = 'Running Repairs';

      let rawReason = ro.delay_reason || 'No Reason Specified';
      let reason = String(rawReason).trim();
      if (reason === '') reason = 'No Reason Specified';

      const days = parseInt(ro.open_days) || 0;
      
      // Bucket logic
      let b0_4 = 0, b5_7 = 0, b8_15 = 0, b15_plus = 0;
      if (days <= 4) b0_4 = 1;
      else if (days <= 7) b5_7 = 1;
      else if (days <= 15) b8_15 = 1;
      else b15_plus = 1;

      // Type Group
      if (!byType[type]) byType[type] = { count: 0, d0_4: 0, d5_7: 0, d8_15: 0, d15_plus: 0, totalDays: 0, items: [] };
      byType[type].count++;
      byType[type].d0_4 += b0_4;
      byType[type].d5_7 += b5_7;
      byType[type].d8_15 += b8_15;
      byType[type].d15_plus += b15_plus;
      byType[type].totalDays += days;
      byType[type].items.push(ro);

      gTotal.count++;
      gTotal.d0_4 += b0_4;
      gTotal.d5_7 += b5_7;
      gTotal.d8_15 += b8_15;
      gTotal.d15_plus += b15_plus;
      gTotal.totalDays += days;

      // Reason Group
      if (!byReason[reason]) byReason[reason] = { reason, mech: 0, acc: 0, count: 0, d0_4: 0, d5_7: 0, d8_15: 0, d15_plus: 0, totalDays: 0 };
      
      const isAcc = type === 'Accident';
      if (isAcc) byReason[reason].acc++; else byReason[reason].mech++;
      byReason[reason].count++;
      byReason[reason].d0_4 += b0_4;
      byReason[reason].d5_7 += b5_7;
      byReason[reason].d8_15 += b8_15;
      byReason[reason].d15_plus += b15_plus;
      byReason[reason].totalDays += days;

      if (isAcc) rTotal.acc++; else rTotal.mech++;
      rTotal.d0_4 += b0_4;
      rTotal.d5_7 += b5_7;
      rTotal.d8_15 += b8_15;
      rTotal.d15_plus += b15_plus;
      rTotal.totalDays += days;
    });

    const byReasonArray = Object.values(byReason).sort((a,b) => b.count - a.count);

    return { byType, byReason: byReasonArray, totalRow: gTotal, reasonTotalRow: rTotal };
  }, [filteredOpenRos]);

  const isMTD = useMemo(() => {
    if (!masterData?.systemToday) return true;
    const today = masterData.systemToday;
    const firstOfMonth = today.substring(0, 8) + '01';
    return startDate === firstOfMonth && endDate === today;
  }, [startDate, endDate, masterData]);

  // Sync state after mount and load theme from localstorage
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('smam_theme') || 'standard';
    setTheme(savedTheme);
  }, []);

  // Update theme on documentElement
  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('smam_theme', theme);
    }
  }, [theme, mounted]);

  // Close all popup menus helper
  const closeAllMenus = useCallback(() => {
    setLocMenuOpen(false);
    setServMenuOpen(false);
    setStatusMenuOpen(false);
    setDateMenuOpen(false);
    setThemeMenuOpen(false);
    setSaMenuOpen(false);
  }, []);

  const toggleTrendGroup = (g) => {
    setTrendExpandedGroups(prev => ({ ...prev, [g]: !prev[g] }));
  };

  const toggleMax = (cardId) => {
    setMaximizedCard(prev => prev === cardId ? null : cardId);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const setPresetRange = (type) => {
    const todayStr = masterData?.systemToday || new Date().toISOString().slice(0, 10);
    const todayObj = new Date(todayStr.replace(/-/g, '/'));
    const fmt = (d) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    
    if (type === 'thisMonth') {
      const firstDay = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1);
      setStartDate(fmt(firstDay));
      setEndDate(todayStr);
    } else if (type === 'lastMonth') {
      const firstDay = new Date(todayObj.getFullYear(), todayObj.getMonth() - 1, 1);
      const lastDay = new Date(todayObj.getFullYear(), todayObj.getMonth(), 0);
      setStartDate(fmt(firstDay));
      setEndDate(fmt(lastDay));
    } else if (type === 'ytd') {
      const year = todayObj.getMonth() < 3 ? todayObj.getFullYear() - 1 : todayObj.getFullYear();
      const aprilFirst = new Date(year, 3, 1);
      setStartDate(fmt(aprilFirst));
      setEndDate(todayStr);
    } else if (type === 'full') {
      setStartDate('2024-01-01');
      setEndDate(todayStr);
    }
    setDateMenuOpen(false);
  };

  // Handle outside clicks to close dropdown menus
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.loc-popup') && 
          !e.target.closest('.serv-type-popup') && 
          !e.target.closest('.theme-popup') && 
          !e.target.closest('.date-popup') && 
          !e.target.closest('.sa-popup') && 
          !e.target.closest('.tab') && 
          !e.target.closest('.header-tab-badge')) {
        closeAllMenus();
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [closeAllMenus]);

  // Fetch summary dashboard data from Next.js serverless BigQuery API
  const fetchSummaryData = useCallback(async (force = false) => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/summary?startDate=${startDate}&endDate=${endDate}&force=${force}`);
      const data = await res.json();
      if (!data.error) {
        setMasterData(data);
        setSyncStatus(data.lastSync || null);
        
        // Auto-select service types on first load
        if (selectedServiceTypes.length === 0 && data.results) {
          const types = Array.from(new Set(data.results.map(r => r.Type).filter(Boolean))).sort();
          setSelectedServiceTypes(types.filter(t => {
            const up = t.toUpperCase();
            return up !== 'PDI' && !up.includes('CAMPAIGN');
          }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }, [startDate, endDate, selectedServiceTypes.length]);

  // Fetch operations data (Ops/Backlog section)
  const fetchOperationsData = useCallback(async () => {
    setLoadingOps(true);
    try {
      const [roRes, progRes] = await Promise.all([
        fetch('/api/open-ro?limit=100'),
        fetch(`/api/programs?startDate=${startDate}&endDate=${endDate}`)
      ]);
      const roData = await roRes.json();
      const progData = await progRes.json();
      
      setOpsOpenRos(roData.openRos || []);
      setOpsMemberships(progData.memberships?.recent || []);
      setOpsAmc(progData.amc?.recent || []);
      setOpsEw(progData.ew?.recent || []);
      setOpsAmcSummary(progData.amc?.summary || []);
      setOpsEwSummary(progData.ew?.summaryByLocation || []);
      setOpsRsaSummary(progData.rsa?.summaryByLocation || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOps(false);
    }
  }, [startDate, endDate]);

  // Fetch forensics data (Performance Modal)
  const fetchForensicsData = useCallback(async () => {
    setLoadingForensics(true);
    try {
      const res = await fetch(`/api/forensics?startDate=${startDate}&endDate=${endDate}&limit=1000`);
      const data = await res.json();
      if (!data.error) {
        setForensicsSummary(data.summary || null);
        setForensicsAdvisors(data.advisors || []);
        setFlaggedInvoices(data.flaggedInvoices || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingForensics(false);
    }
  }, [startDate, endDate]);

  // Fetch data depending on active sections or when dates change
  useEffect(() => {
    fetchSummaryData();
  }, [startDate, endDate]);

  useEffect(() => {
    if (activeSection === 'ops' || activeSection === 'vas') {
      fetchOperationsData();
    }
  }, [activeSection, fetchOperationsData]);

  useEffect(() => {
    if (vasOpenRoMode && (!opsOpenRos || opsOpenRos.length === 0)) {
      fetchOperationsData();
    }
  }, [vasOpenRoMode, opsOpenRos, fetchOperationsData]);

  useEffect(() => {
    if (perfModalOpen) {
      fetchForensicsData();
    }
  }, [perfModalOpen, fetchForensicsData]);

  // Trigger mock sync
  const triggerSync = () => {
    alert("Sync Job Submitted successfully! Live data will automatically pull from BigQuery in 15-30 seconds.");
    fetchSummaryData(true);
  };

  // Safe formatting helpers
  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '₹0';
    if (val >= 100000) return '₹' + (val / 100000).toFixed(2) + ' L';
    return '₹' + Math.round(val).toLocaleString('en-IN');
  };

  const formatNumber = (val) => {
    if (val === undefined || val === null) return '0';
    return Math.round(val).toLocaleString('en-IN');
  };

  const calcGrowth = (cy, ly) => {
    const nCy = Number(cy) || 0;
    const nLy = Number(ly) || 0;
    if (nLy === 0) return nCy > 0 ? '+100%' : '0%';
    const diff = ((nCy - nLy) / nLy) * 100;
    return (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';
  };

  const getGrowthClass = (valStr) => {
    return valStr.includes('-') ? 'pill neg' : 'pill pos';
  };

  // Perform aggregations dynamically on masterData.results
  const aggregatedData = useMemo(() => {
    if (!masterData || !masterData.results) return null;
    
    const results = masterData.results;
    
    // Count activity for SAs inside the filtered context
    const saCounts = {};
    const typesSet = new Set();
    const modelsSet = new Set();
    
    results.forEach(r => {
      const locMatch = selectedLoc === 'All Locations' || r.Location === selectedLoc;
      const typeMatch = selectedServiceTypes.length === 0 || selectedServiceTypes.includes(r.Type);
      
      if (locMatch) {
        if (r.Type) typesSet.add(r.Type);
        if (r.SA) saCounts[r.SA] = (saCounts[r.SA] || 0) + (r.cy || 0);
      }
    });

    const activeSAsList = Object.keys(saCounts).filter(sa => saCounts[sa] > 0).sort();

    // Overall Load (Location Aggregations)
    const locAggs = {};
    const targetLocs = selectedLoc === 'All Locations' 
      ? ['JAMMU', 'KATHUA', 'POONCH', 'SAMBA'] 
      : [selectedLoc];
    targetLocs.forEach(loc => {
      locAggs[loc] = { Location: loc, td: 0, rcy: 0, rly: 0, cy: 0, ly: 0, qcy: 0, qly: 0, ycy: 0, yly: 0, fmly: 0 };
    });

    const totalAgg = { 
      Location: 'Total', td: 0, rcy: 0, rly: 0, cy: 0, ly: 0, qcy: 0, qly: 0, ycy: 0, yly: 0, fmly: 0,
      lab_td: 0, part_td: 0,
      lab_rcy: 0, lab_rly: 0, lab_cy: 0, lab_ly: 0, lab_qcy: 0, lab_qly: 0, lab_ycy: 0, lab_yly: 0,
      part_rcy: 0, part_rly: 0, part_cy: 0, part_ly: 0, part_qcy: 0, part_qly: 0, part_ycy: 0, part_yly: 0,
      wa_cy: 0, wb_cy: 0, vas_cy: 0, wa_count_cy: 0, wb_count_cy: 0, disc_cy: 0,
      wa_rcy: 0, wb_rcy: 0, vas_rcy: 0, wa_count_rcy: 0, wb_count_rcy: 0, disc_rcy: 0,
      lab_fmly: 0, part_fmly: 0
    };

    // Service type performance trends
    const serviceAggs = {};

    // Detailed VAS table aggregations
    const vasServiceAggs = {};

    results.forEach(r => {
      const locMatch = selectedLoc === 'All Locations' || r.Location === selectedLoc;
      if (!locMatch) return;

      const sType = r.Type || 'Other';
      const typeMatch = selectedServiceTypes.length === 0 || selectedServiceTypes.includes(sType);
      if (!typeMatch) return;

      const keys = ['td', 'rcy', 'rly', 'cy', 'ly', 'qcy', 'qly', 'ycy', 'yly'];

      // Update location aggregations
      if (locAggs[r.Location]) {
        const l = locAggs[r.Location];
        keys.forEach(k => {
          const val = Number(r[k]) || 0;
          l[k] += val;
          totalAgg[k] += val;
        });
        l.fmly += (Number(r.fmly) || 0);
        totalAgg.fmly += (Number(r.fmly) || 0);
      }

      // Update Service Type aggregation
      if (!serviceAggs[sType]) {
        serviceAggs[sType] = { Location: sType, td: 0, rcy: 0, rly: 0, cy: 0, ly: 0, qcy: 0, qly: 0, ycy: 0, yly: 0, val_td: 0, val_rcy: 0, val_rly: 0, val_cy: 0, val_ly: 0, val_qcy: 0, val_qly: 0, val_ycy: 0, val_yly: 0, fmly: 0, lab_fmly: 0, part_fmly: 0 };
      }
      const ts = serviceAggs[sType];
      keys.forEach(k => {
        ts[k] += (Number(r[k]) || 0);
        
        const mode = currentTrendTab.replace('Eff', '');
        const moneyPrefix = mode === 'lab' ? 'lab_' : 'part_';
        ts['val_' + k] += (mode === 'load' ? (Number(r[k]) || 0) : (Number(r[moneyPrefix + k]) || 0));
      });
      ts.fmly += (Number(r.fmly) || 0);

      const fields = [
        'lab_rcy', 'lab_rly', 'lab_cy', 'lab_ly', 'lab_qcy', 'lab_qly', 'lab_ycy', 'lab_yly',
        'part_rcy', 'part_rly', 'part_cy', 'part_ly', 'part_qcy', 'part_qly', 'part_ycy', 'part_yly',
        'wa_cy', 'wb_cy', 'vas_cy', 'wa_count_cy', 'wb_count_cy', 'disc_cy',
        'wa_rcy', 'wb_rcy', 'vas_rcy', 'wa_count_rcy', 'wb_count_rcy', 'disc_rcy',
        'lab_fmly', 'part_fmly', 'lab_td', 'part_td'
      ];
      fields.forEach(f => {
        totalAgg[f] = (totalAgg[f] || 0) + (Number(r[f]) || 0);
        ts[f] = (ts[f] || 0) + (Number(r[f]) || 0);
      });

      // Detailed VAS Section advisors filtering
      const rSA = (r.SA || '').trim().toUpperCase();
      const isSAFiltered = selectedSAs.length === 0 || selectedSAs.includes(rSA);
      if (!isSAFiltered) return;

      const sTypeUpper = sType.toUpperCase();
      const isAccidentalRow = sTypeUpper.includes('ACCIDENT');
      let typeModeMatch = true;
      if (vasTypeMode === 'MECH') typeModeMatch = !isAccidentalRow;
      else if (vasTypeMode === 'ACC') typeModeMatch = isAccidentalRow;

      if (!typeModeMatch) return;

      const groupKey = vasViewMode === 'advisor' ? (rSA || 'UNKNOWN ADVISOR') : sType;
      if (!vasServiceAggs[groupKey]) {
        vasServiceAggs[groupKey] = {
          Location: groupKey, td: 0, rcy: 0, rly: 0, cy: 0, ly: 0, qcy: 0, qly: 0, ycy: 0, yly: 0,
          val_td: 0, val_rcy: 0, val_rly: 0, val_cy: 0, val_ly: 0, val_qcy: 0, val_qly: 0, val_ycy: 0, val_yly: 0,
          vas_cy: 0, lab_cy: 0, part_cy: 0, wa_count_cy: 0, wa_cy: 0, wb_count_cy: 0, wb_cy: 0, disc_cy: 0,
          vas_rcy: 0, lab_rcy: 0, part_rcy: 0, wa_count_rcy: 0, wa_rcy: 0, wb_count_rcy: 0, wb_rcy: 0, disc_rcy: 0,
          advisors: new Set(), monthlyAdvisors: new Set(),
          breakdown: {}
        };
      }
      
      const s = vasServiceAggs[groupKey];
      const isBenchRow = (r.is_full_month === true || r.is_full_month === 'true');
      
      if (!isBenchRow) {
        if (vasViewMode === 'advisor') {
          if (!s.breakdown[sType]) {
            s.breakdown[sType] = { Location: sType, cy: 0, lab_cy: 0, vas_cy: 0, part_cy: 0, disc_cy: 0, wa_count_cy: 0, wa_cy: 0, wb_count_cy: 0, wb_cy: 0 };
          }
          const b = s.breakdown[sType];
          b.cy += (isMTD ? (Number(r.cy) || 0) : (Number(r.rcy) || 0));
          b.lab_cy += (isMTD ? (Number(r.lab_cy) || 0) : (Number(r.lab_rcy) || 0));
          b.vas_cy += (isMTD ? (Number(r.vas_cy) || 0) : (Number(r.vas_rcy) || 0));
          b.part_cy += (isMTD ? (Number(r.part_cy) || 0) : (Number(r.part_rcy) || 0));
          b.disc_cy += (isMTD ? (Number(r.disc_cy) || 0) : (Number(r.disc_rcy) || 0));
          b.wa_count_cy += (isMTD ? (Number(r.wa_count_cy) || 0) : (Number(r.wa_count_rcy) || 0));
          b.wa_cy += (isMTD ? (Number(r.wa_cy) || 0) : (Number(r.wa_rcy) || 0));
          b.wb_count_cy += (isMTD ? (Number(r.wb_count_cy) || 0) : (Number(r.wb_count_rcy) || 0));
          b.wb_cy += (isMTD ? (Number(r.wb_cy) || 0) : (Number(r.wb_rcy) || 0));
        }

        const vKey = isMTD ? 'vas_cy' : 'vas_rcy';
        const wKey = isMTD ? 'wa_cy' : 'wa_rcy';
        const wcKey = isMTD ? 'wa_count_cy' : 'wa_count_rcy';
        const bKey = isMTD ? 'wb_cy' : 'wb_rcy';
        const bcKey = isMTD ? 'wb_count_cy' : 'wb_count_rcy';
        const dKey = isMTD ? 'disc_cy' : 'disc_rcy';

        s.cy += (Number(r[isMTD ? 'cy' : 'rcy']) || 0);
        s.vas_cy += (Number(r[vKey]) || 0);
        s.lab_cy += (Number(r[isMTD ? 'lab_cy' : 'lab_rcy']) || 0);
        s.part_cy += (Number(r[isMTD ? 'part_cy' : 'part_rcy']) || 0);
        s.wa_count_cy += (Number(r[wcKey]) || 0);
        s.wa_cy += (Number(r[wKey]) || 0);
        s.wb_count_cy += (Number(r[bcKey]) || 0);
        s.wb_cy += (Number(r[bKey]) || 0);
        s.disc_cy += (Number(r[dKey]) || 0);

        if (rSA) {
          s.advisors.add(rSA);
          if (isMTD && r.cy > 0) s.monthlyAdvisors.add(rSA);
          else if (!isMTD && r.rcy > 0) s.monthlyAdvisors.add(rSA);
        }
      }
    });

    return {
      locs: Object.values(locAggs).sort((a, b) => b.rcy - a.rcy),
      total: totalAgg,
      service: Object.values(serviceAggs),
      vasService: Object.values(vasServiceAggs),
      activeSAsList,
      uniqueTypesList: Array.from(typesSet).sort()
    };
  }, [masterData, selectedLoc, selectedServiceTypes, selectedSAs, currentTrendTab, vasViewMode, vasTypeMode, startDate, endDate]);

  // Day Trends chart processing
  const processedDayTrends = useMemo(() => {
    if (!masterData || !masterData.dayTrends) return [];

    const dayTrends = masterData.dayTrends;
    const todayObj = new Date(masterData.systemToday.replace(/-/g, '/'));
    const currentMonth = todayObj.getMonth();
    const currentYear = todayObj.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const trendMap = {};
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = String(i).padStart(2, '0');
      trendMap[dayStr] = { day: dayStr, cy: 0, ly: 0, lab_cy: 0, lab_ly: 0, part_cy: 0, part_ly: 0 };
    }

    dayTrends.forEach(r => {
      const locMatch = selectedLoc === 'All Locations' || r.Location === selectedLoc;
      if (!locMatch) return;

      const rowType = r.Type || 'Other';
      if (currentTrendServiceType !== 'All') {
        let match = false;
        if (currentTrendServiceType === 'Others') {
          if (rowType !== 'Paid Service' && rowType !== 'Free Services' && rowType !== 'Running Repairs' && rowType !== 'Accident') match = true;
        } else {
          if (rowType === currentTrendServiceType) match = true;
        }
        if (!match) return;
      }

      const day = r.d.substring(8, 10);
      if (trendMap[day]) {
        trendMap[day].cy += (Number(r.cy) || 0);
        trendMap[day].ly += (Number(r.ly) || 0);
        trendMap[day].lab_cy += (Number(r.lab_cy) || 0);
        trendMap[day].lab_ly += (Number(r.lab_ly) || 0);
        trendMap[day].part_cy += (Number(r.part_cy) || 0);
        trendMap[day].part_ly += (Number(r.part_ly) || 0);
      }
    });

    const trendData = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = String(i).padStart(2, '0');
      const base = trendMap[dayStr];
      
      let cyVal = 0, lyVal = 0;
      if (currentTrendMode === 'load') {
        cyVal = base.cy; lyVal = base.ly;
      } else if (currentTrendMode === 'lab') {
        cyVal = base.lab_cy; lyVal = base.lab_ly;
      } else if (currentTrendMode === 'part') {
        cyVal = base.part_cy; lyVal = base.part_ly;
      } else if (currentTrendMode === 'lab_per') {
        cyVal = base.cy > 0 ? (base.lab_cy / base.cy) : 0;
        lyVal = base.ly > 0 ? (base.lab_ly / base.ly) : 0;
      } else if (currentTrendMode === 'part_per') {
        cyVal = base.cy > 0 ? (base.part_cy / base.cy) : 0;
        lyVal = base.ly > 0 ? (base.part_ly / base.ly) : 0;
      }

      const dObj = new Date(currentYear, currentMonth, i);
      const dayName = dObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      
      trendData.push({ 
        day: dayStr, 
        dayName: dayName, 
        cy: Math.round(cyVal), 
        ly: Math.round(lyVal)
      });
    }

    return trendData;
  }, [masterData, selectedLoc, currentTrendServiceType, currentTrendMode]);

  const processedFyTrends = useMemo(() => {
    if (!masterData || !masterData.fyTrends) return null;
    
    const aggregated = {};
    masterData.fyTrends.forEach(f => {
      const locMatch = selectedLoc === 'All Locations' || f.Location === selectedLoc;
      if (locMatch) {
        if (!aggregated[f.fy]) {
          aggregated[f.fy] = { fy: f.fy, load: 0, labour: 0, part: 0 };
        }
        aggregated[f.fy].load += (Number(f.load) || 0);
        aggregated[f.fy].labour += (Number(f.labour) || 0);
        aggregated[f.fy].part += (Number(f.part) || 0);
      }
    });

    const years = Object.keys(aggregated).sort((a, b) => b.localeCompare(a));
    return years.map(y => aggregated[y]);
  }, [masterData, selectedLoc]);

  // Day-wise Trend target KPIs calculations
  const trendKpis = useMemo(() => {
    if (!masterData || !aggregatedData) return null;
    return getTrendKpis(processedDayTrends, aggregatedData);
  }, [masterData, processedDayTrends, aggregatedData, currentTrendMode, currentTrendServiceType]);

  function getTrendKpis(trends, data) {
    const todayObj = new Date(masterData.systemToday.replace(/-/g, '/'));
    const currentMonth = todayObj.getMonth();
    const currentYear = todayObj.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const sysDate = new Date();
    const isCurrentMonth = (todayObj.getMonth() === sysDate.getMonth() && todayObj.getFullYear() === sysDate.getFullYear());
    const daysPassed = isCurrentMonth ? sysDate.getDate() : todayObj.getDate();
    const remainingDays = Math.max(1, daysInMonth - daysPassed);

    let cyKey = 'cy', fmKey = 'fmly';
    let isMoney = false;
    let isPerVehicle = false;

    if (currentTrendMode === 'lab') {
      cyKey = 'lab_cy'; fmKey = 'lab_fmly'; isMoney = true;
    } else if (currentTrendMode === 'part') {
      cyKey = 'part_cy'; fmKey = 'part_fmly'; isMoney = true;
    } else if (currentTrendMode === 'lab_per') {
      isMoney = true; isPerVehicle = true;
    } else if (currentTrendMode === 'part_per') {
      isMoney = true; isPerVehicle = true;
    }

    let sourceData = { cy: 0, fmly: 0 };
    if (isPerVehicle) {
      let l_cy = 0, l_fmly = 0, v_cy = 0, v_fmly = 0;
      const prefix = currentTrendMode === 'lab_per' ? 'lab_' : 'part_';

      if (currentTrendServiceType === 'All') {
        l_cy = data.total[prefix + 'cy'] || 0;
        l_fmly = data.total[prefix + 'fmly'] || 0;
        v_cy = data.total.cy || 0;
        v_fmly = data.total.fmly || 0;
      } else if (currentTrendServiceType === 'Others') {
        data.service.forEach(s => {
          const rowType = s.Location;
          if (rowType !== 'Paid Service' && rowType !== 'Free Services' && rowType !== 'Running Repairs' && rowType !== 'Accident') {
            l_cy += (s[prefix + 'cy'] || 0);
            l_fmly += (s[prefix + 'fmly'] || 0);
            v_cy += (s.cy || 0);
            v_fmly += (s.fmly || 0);
          }
        });
      } else {
        const stData = data.service.find(s => s.Location === currentTrendServiceType);
        if (stData) {
          l_cy = stData[prefix + 'cy'] || 0;
          l_fmly = stData[prefix + 'fmly'] || 0;
          v_cy = stData.cy || 0;
          v_fmly = stData.fmly || 0;
        }
      }

      sourceData.cy = v_cy > 0 ? (l_cy / v_cy) : 0;
      sourceData.fmly = v_fmly > 0 ? (l_fmly / v_fmly) : 0;
    } else {
      if (currentTrendServiceType === 'All') {
        sourceData.cy = data.total[cyKey] || 0;
        sourceData.fmly = data.total[fmKey] || 0;
      } else if (currentTrendServiceType === 'Others') {
        data.service.forEach(s => {
          const rowType = s.Location;
          if (rowType !== 'Paid Service' && rowType !== 'Free Services' && rowType !== 'Running Repairs' && rowType !== 'Accident') {
            sourceData.cy += (s[cyKey] || 0);
            sourceData.fmly += (s[fmKey] || 0);
          }
        });
      } else {
        const stData = data.service.find(s => s.Location === currentTrendServiceType);
        if (stData) {
          sourceData.cy = stData[cyKey] || 0;
          sourceData.fmly = stData[fmKey] || 0;
        }
      }
    }

    const fullMonthTarget = (sourceData.fmly || 0) * 1.10;
    const mtdTarget = (fullMonthTarget / daysInMonth) * daysPassed || 0;
    const achieved = sourceData.cy;
    const shortfallTD = Math.max(0, mtdTarget - achieved);
    const shortfallMonthly = Math.max(0, fullMonthTarget - achieved);
    const projectedClosing = (achieved / (daysPassed || 1)) * daysInMonth;
    const askingRate = shortfallMonthly / remainingDays;

    return {
      fullMonthTarget,
      mtdTarget,
      achieved,
      shortfallTD,
      shortfallMonthly,
      projectedClosing,
      askingRate,
      isMoney,
      isPerVehicle
    };
  }

  // Filter SAs in the checkbox list based on Location
  const updateSASelection = (sa, checked) => {
    if (checked) {
      setSelectedSAs(prev => [...prev, sa]);
    } else {
      setSelectedSAs(prev => prev.filter(item => item !== sa));
    }
  };

  const handleSelectAllSAs = (checked) => {
    if (checked && aggregatedData) {
      setSelectedSAs([...aggregatedData.activeSAsList]);
    } else {
      setSelectedSAs([]);
    }
  };

  // Service Type Performance categorization helper (trends page)
  const categorizedServiceData = useMemo(() => {
    if (!aggregatedData) return null;

    const createGroup = (name) => ({ Location: name, td: 0, rcy: 0, rly: 0, cy: 0, ly: 0, qcy: 0, qly: 0, ycy: 0, yly: 0, val_td: 0, val_rcy: 0, val_rly: 0, val_cy: 0, val_ly: 0, val_qcy: 0, val_qly: 0, val_ycy: 0, val_yly: 0 });
    
    const groups = {
      'Paid Services': { items: [], totals: createGroup('Paid Services') },
      'Free Services': { items: [], totals: createGroup('Free Services') },
      'Running Repairs': { items: [], totals: createGroup('Running Repairs') },
      'Accidental': { items: [], totals: createGroup('Accidental') },
      'Others': { items: [], totals: createGroup('Others') }
    };

    const mech1 = createGroup('Mechanical Total');
    const mech2 = createGroup('Mechanical Total (Incl. Others)');
    const total = createGroup('Total');

    aggregatedData.service.forEach(s => {
      const name = s.Location.toUpperCase();
      let gn = 'Others';
      if (name.includes('FREE')) gn = 'Free Services';
      else if (name.includes('PAID')) gn = 'Paid Services';
      else if (name.includes('RUNNING')) gn = 'Running Repairs';
      else if (name.includes('ACCIDENT')) gn = 'Accidental';

      const group = groups[gn];
      group.items.push(s);
      
      const keys = ['td', 'rcy', 'rly', 'cy', 'ly', 'qcy', 'qly', 'ycy', 'yly'];
      keys.forEach(k => {
        group.totals[k] += s[k];
        group.totals['val_' + k] += s['val_' + k];
      });
    });

    // Subtotal aggregates
    const keys = ['td', 'rcy', 'rly', 'cy', 'ly', 'qcy', 'qly', 'ycy', 'yly'];
    ['Paid Services', 'Free Services', 'Running Repairs'].forEach(gn => {
      const g = groups[gn].totals;
      keys.forEach(k => {
        mech1[k] += g[k];
        mech1['val_' + k] += g['val_' + k];
      });
    });

    keys.forEach(k => {
      mech2[k] = mech1[k] + groups['Others'].totals[k];
      mech2['val_' + k] = mech1['val_' + k] + groups['Others'].totals['val_' + k];
    });

    const acc = groups['Accidental'].totals;
    keys.forEach(k => {
      total[k] = mech2[k] + acc[k];
      total['val_' + k] = mech2['val_' + k] + acc['val_' + k];
    });

    // Set group location to single item location if only 1 item
    Object.keys(groups).forEach(gn => {
      const g = groups[gn];
      if (gn === 'Accidental') {
        g.totals.Location = 'ACCIDENT';
      } else if (g.items.length === 1) {
        g.totals.Location = g.items[0].Location;
      }
    });

    return {
      groups,
      mech1,
      mech2,
      total
    };
  }, [aggregatedData, currentTrendTab]);

  // Formatter for Service Type Performance values
  const formatServicePerformanceValue = (group, k) => {
    const isEff = currentTrendTab.includes('Eff');
    const mode = currentTrendTab.replace('Eff', '');
    if (isEff) {
      const val = group['val_' + k];
      const count = group[k];
      return count > 0 ? Math.round(val / count).toString() : '0';
    }
    return mode === 'load' ? formatNumber(group[k]) : formatCurrency(group['val_' + k]);
  };

  const getServiceGrowth = (group, kCy, kLy) => {
    const isEff = currentTrendTab.includes('Eff');
    const mode = currentTrendTab.replace('Eff', '');
    let cy = group['val_' + kCy];
    let ly = group['val_' + kLy];
    if (mode === 'load') {
      cy = group[kCy];
      ly = group[kLy];
    } else if (isEff) {
      cy = group[kCy] > 0 ? (group['val_' + kCy] / group[kCy]) : 0;
      ly = group[kLy] > 0 ? (group['val_' + kLy] / group[kLy]) : 0;
    }
    return calcGrowth(cy, ly);
  };

  // Helper row renderer for Service Type Performance table
  const renderServiceRow = (g, isGroup = false, groupName = '', extraClass = '') => {
    const gm = getServiceGrowth(g, 'rcy', 'rly');
    const gq = getServiceGrowth(g, 'qcy', 'qly');
    const gy = getServiceGrowth(g, 'ycy', 'yly');
    
    const expanded = groupName && trendExpandedGroups[groupName];
    const hasChildren = groupName && categorizedServiceData?.groups[groupName]?.items?.length > 1;
    
    const rowClass = isGroup ? 'group-row' : 'child-row';
    const clickHandler = isGroup && hasChildren ? () => toggleTrendGroup(groupName) : undefined;
    
    return (
      <tr key={g.Location + (isGroup ? '_g' : '_c')} className={`${rowClass} ${extraClass}`} onClick={clickHandler} style={{ cursor: clickHandler ? 'pointer' : 'default' }}>
        <td style={{ textAlign: 'left', fontWeight: isGroup ? '700' : 'normal', paddingLeft: isGroup ? '10px' : '25px' }}>
          {isGroup && hasChildren && (
            <span className={`group-icon ${expanded ? 'expanded' : ''}`} style={{ display: 'inline-block', width: '12px', transition: 'transform 0.2s', fontSize: '8px', marginRight: '5px', transform: expanded ? 'rotate(90deg)' : 'none' }}>▶</span>
          )}
          {g.Location}
        </td>
        <td>{formatServicePerformanceValue(g, 'td')}</td>
        <td>{formatServicePerformanceValue(g, 'rcy')}</td>
        <td>{formatServicePerformanceValue(g, 'rly')}</td>
        <td><span className={getGrowthClass(gm)}>{gm}</span></td>
        <td>{formatServicePerformanceValue(g, 'qcy')}</td>
        <td>{formatServicePerformanceValue(g, 'qly')}</td>
        <td><span className={getGrowthClass(gq)}>{gq}</span></td>
        <td>{formatServicePerformanceValue(g, 'ycy')}</td>
        <td>{formatServicePerformanceValue(g, 'yly')}</td>
        <td><span className={getGrowthClass(gy)}>{gy}</span></td>
      </tr>
    );
  };

  // Detailed VAS Table view mode groupings (vas view mode)
  const vasTableData = useMemo(() => {
    if (!aggregatedData) return null;

    const createEmpty = () => ({ cy: 0, rcy: 0, lab_cy: 0, lab_rcy: 0, vas_cy: 0, vas_rcy: 0, part_cy: 0, part_rcy: 0, disc_cy: 0, disc_rcy: 0, wa_count_cy: 0, wa_count_rcy: 0, wa_cy: 0, wa_rcy: 0, wb_count_cy: 0, wb_count_rcy: 0, wb_cy: 0, wb_rcy: 0 });
    const addG = (target, src) => {
      if (!src) return;
      ['cy', 'rcy', 'lab_cy', 'lab_rcy', 'vas_cy', 'vas_rcy', 'part_cy', 'part_rcy', 'disc_cy', 'disc_rcy', 'wa_count_cy', 'wa_count_rcy', 'wa_cy', 'wa_rcy', 'wb_count_cy', 'wb_count_rcy', 'wb_cy', 'wb_rcy'].forEach(f => {
        target[f] += (src[f] || 0);
      });
    };

    const grouped = {};
    if (vasViewMode === 'advisor') {
      aggregatedData.vasService.forEach(s => {
        grouped[s.Location] = { 
          items: Object.values(s.breakdown || {}), 
          totals: s, 
          advisors: new Set([s.Location]), 
          monthlyAdvisors: new Set([s.Location]) 
        };
      });
      return { 
          grouped, 
          sortedKeys: Object.keys(grouped)
            .filter(k => grouped[k].totals.cy > 0)
            .sort((a, b) => grouped[b].totals.cy - grouped[a].totals.cy) 
        };
      } else {
      // Group by categories
      ['Paid Services', 'Free Services', 'Running Repairs', 'Accidental', 'Others'].forEach(gn => {
        grouped[gn] = { items: [], totals: createEmpty(), advisors: new Set(), monthlyAdvisors: new Set() };
      });

      aggregatedData.vasService.forEach(s => {
        const t = s.Location.toUpperCase();
        let gn = 'Others';
        if (t.includes('FREE')) gn = 'Free Services';
        else if (t.includes('PAID')) gn = 'Paid Services';
        else if (t.includes('RUNNING')) gn = 'Running Repairs';
        else if (t.includes('ACCIDENT')) gn = 'Accidental';

        const g = grouped[gn];
        g.items.push(s);
        addG(g.totals, s);

        if (s.advisors) s.advisors.forEach(sa => g.advisors.add(sa));
        if (s.monthlyAdvisors) s.monthlyAdvisors.forEach(sa => g.monthlyAdvisors.add(sa));
      });

      const m1 = createEmpty();
      addG(m1, grouped['Paid Services'].totals);
      addG(m1, grouped['Free Services'].totals);
      addG(m1, grouped['Running Repairs'].totals);

      const m2 = createEmpty();
      addG(m2, m1);
      addG(m2, grouped['Others'].totals);

      const totals = createEmpty();
      addG(totals, m2);
      addG(totals, grouped['Accidental'].totals);

      return {
        grouped,
        mech1: m1,
        mech2: m2,
        totals
      };
    }
  }, [aggregatedData, vasViewMode, vasTypeMode]);

  // Filtered Forensics modal list
  const filteredForensicsList = useMemo(() => {
    return flaggedInvoices.filter(r => {
      const matchSearch = !perfSearchReg || r.reg_no?.toLowerCase().includes(perfSearchReg.toLowerCase()) || r.invoice_number?.toLowerCase().includes(perfSearchReg.toLowerCase());
      const matchLoc = perfFilterLoc === 'All' || r.Location === perfFilterLoc; // wait, r.Location is not direct, let's see. In route.js, location is not returned but we can check or ignore if location not present.
      
      const alerts = [];
      if (r.alert_rework === 1) alerts.push('Rework');
      if (r.alert_discount === 1) alerts.push('Discount');
      if (r.alert_leak === 1) alerts.push('Leak');
      if (r.alert_low_lab === 1) alerts.push('LowLabour');
      if (r.alert_low_part === 1) alerts.push('LowPart');
      if (r.alert_low_lab_global === 1) alerts.push('LowLabourGlobal');
      if (r.alert_low_part_global === 1) alerts.push('LowPartGlobal');

      const matchAlert = perfFilterAlert === 'All' || 
                         (perfFilterAlert === 'LowRevenue' && (r.alert_low_lab === 1 || r.alert_low_part === 1 || r.alert_low_lab_global === 1 || r.alert_low_part_global === 1)) || 
                         alerts.includes(perfFilterAlert);
                         
      const matchSA = perfFilterSA === 'All' || r.advisor_name?.toUpperCase() === perfFilterSA.toUpperCase();
      const matchType = perfFilterType === 'All' || r.service_type === perfFilterType;
      const matchModel = perfFilterModel === 'All' || r.ppl === perfFilterModel;

      return matchSearch && matchAlert && matchSA && matchLoc && matchType && matchModel;
    });
  }, [flaggedInvoices, perfSearchReg, perfFilterAlert, perfFilterSA, perfFilterLoc, perfFilterType, perfFilterModel]);

  const forensicsLocations = useMemo(() => {
    return Array.from(new Set(flaggedInvoices.map(r => r.Location).filter(Boolean))).sort();
  }, [flaggedInvoices]);

  const forensicsModels = useMemo(() => {
    return Array.from(new Set(flaggedInvoices.map(r => r.ppl).filter(Boolean))).sort();
  }, [flaggedInvoices]);

  const forensicsServiceTypes = useMemo(() => {
    return Array.from(new Set(flaggedInvoices.map(r => r.service_type).filter(Boolean))).sort();
  }, [flaggedInvoices]);

  
  const getPctColor = (pctStr) => {
    const val = parseFloat(pctStr);
    return isNaN(val) ? 'inherit' : (val >= 20 ? 'var(--success)' : 'var(--danger)');
  };

  const handleDownloadCSV = () => {
    const headers = ['Sr', 'Branch', 'Type', 'Date', 'Bill No', 'Model', 'Reg Number', 'Advisor', 'Labour Amt', 'Part Amt', 'Discount', 'Discount %', 'Alerts', 'Score'];
    const rows = filteredForensicsList.map((r, i) => {
      const dateStr = r.invoice_date?.value || r.invoice_date || '-';
      const alerts = [];
      if (r.alert_discount === 1) alerts.push('Manual Discount Applied');
      if (r.alert_rework === 1) alerts.push('30-Day Rework');
      if (r.alert_leak === 1) alerts.push('Labour Leakage');
      if (r.alert_low_lab === 1) alerts.push('Labour below Model Avg');
      if (r.alert_low_part === 1) alerts.push('Parts below Model Avg');
      if (r.alert_low_lab_global === 1) alerts.push('Labour below Workshop Avg');
      if (r.alert_low_part_global === 1) alerts.push('Parts below Workshop Avg');
      
      const totalVal = (r.labour_amount || 0) + (r.spare_sale || 0) + (r.discount || 0);
      const discountPct = totalVal > 0 ? ((r.discount || 0) / totalVal * 100).toFixed(1) + '%' : '0%';
      
      return [
        i + 1,
        r.Location || '-',
        r.service_type || '-',
        dateStr,
        r.invoice_number,
        r.ppl || '-',
        r.reg_no,
        r.advisor_name,
        r.labour_amount || 0,
        r.spare_sale || 0,
        r.discount || 0,
        discountPct,
        alerts.join(' | '),
        r.advisor_score || 0
      ].map(v => `"${v}"`).join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "performance_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .fullscreen { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; z-index: 9999 !important; overflow-y: auto !important; background: var(--bg) !important; margin: 0 !important; padding: 20px !important; box-sizing: border-box !important; border-radius: 0 !important; max-height: none !important; width: 100vw !important; height: 100vh !important; }
        .fullscreen .table-container th { font-size: 15px !important; padding: 18px !important; }
        .fullscreen .table-container td { font-size: 15px !important; padding: 16px 18px !important; }
        .fullscreen .table-container td span { font-size: 15px !important; }
        .fullscreen .group-row td { font-size: 16px !important; padding: 18px !important; }
        .fullscreen .child-row td { font-size: 14px !important; padding: 14px 16px !important; }
        .fullscreen .table-container { max-height: calc(100vh - 150px) !important; overflow-y: auto !important; }
      `}} />
      
      {/* Loading overlay spinner */}
      {loadingData && (
        <div id="loader" style={{ display: 'flex' }}>
          <div className="spinner"></div>
        </div>
      )}

      {/* Sidebar Slider Menu */}
      <div className={`sidebar ${sidebarActive ? 'active' : ''}`} id="sidebar">
        <div className="sidebar-header">
          <h3>SMAM TATA PERFORMANCE PORTAL</h3>
        </div>
        <div className="sidebar-menu">
          <div className="sidebar-item sidebar-item-parent open">
            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>OVERALL PERFORMANCE</span>
          </div>
          <div className="sidebar-submenu open">
            <div 
              onClick={() => { setActiveSection('trends'); setSidebarActive(false); }} 
              className={`sidebar-item ${activeSection === 'trends' ? 'active' : ''}`}
            >
              CY / LY Trends
            </div>
            <div 
              onClick={() => { setActiveSection('vas'); setSidebarActive(false); }} 
              className={`sidebar-item ${activeSection === 'vas' ? 'active' : ''}`}
            >
              Workshop Performance
            </div>
            <div 
              onClick={() => { setActiveSection('ops'); setSidebarActive(false); }} 
              className={`sidebar-item ${activeSection === 'ops' ? 'active' : ''}`}
            >
              Workshop Operations
            </div>
          </div>
          <div 
            onClick={triggerSync}
            className="sidebar-item" 
            style={{ background: 'var(--navy)', color: 'white', margin: '15px', borderRadius: '8px', justifyContent: 'center', fontWeight: '700' }}
          >
            SYNC LIVE DATA
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarActive && (
        <div className="sidebar-overlay active" id="sidebarOverlay" onClick={() => setSidebarActive(false)}></div>
      )}

      {/* Top Header Filters & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 10px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="header-tab-badge" onClick={() => setSidebarActive(prev => !prev)}>
            <div style={{ margin: 0 }}>
              <span style={{ display: 'block', background: 'var(--navy)', width: '20px', height: '2.5px', margin: '3px auto', borderRadius: '2px' }}></span>
              <span style={{ display: 'block', background: 'var(--navy)', width: '20px', height: '2.5px', margin: '3px auto', borderRadius: '2px' }}></span>
              <span style={{ display: 'block', background: 'var(--navy)', width: '20px', height: '2.5px', margin: '3px auto', borderRadius: '2px' }}></span>
            </div>
            <span id="activeTabName" style={{ fontSize: '9px', fontWeight: '800', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: '1.2', textAlign: 'center' }}>
              {activeSection === 'trends' ? 'CY / LY\nTRENDS' : activeSection === 'vas' ? 'WORKSHOP\nPERF' : 'WORKSHOP\nOPS'}
            </span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', margin: 0 }}>
            Business Excellence Index SMAM TATA
          </h2>
          {masterData?.globalLastDate ? (
            <span id="lastUpdated" style={{ fontSize: '10px', color: 'var(--subtext)', fontWeight: '600', background: 'rgba(30,58,138,0.05)', padding: '4px 10px', borderRadius: '15px' }}>
              Data as of: {(() => {
                const d = masterData.globalLastDate;
                const parts = d.split('-');
                if (parts.length === 3) {
                  const date = new Date(parts[0], parts[1] - 1, parts[2]);
                  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
                }
                return d;
              })()}
            </span>
          ) : (
            syncStatus && (
              <span id="lastUpdated" style={{ fontSize: '10px', color: 'var(--subtext)', fontWeight: '600', background: 'rgba(30,58,138,0.05)', padding: '4px 10px', borderRadius: '15px' }}>
                Data as of: {new Date(syncStatus.Last_Run?.value || syncStatus.Last_Run).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            )
          )}
        </div>

        {/* Top Dropdowns Buttons Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Location Dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { closeAllMenus(); setLocMenuOpen(!locMenuOpen); }} className="tab active" style={{ padding: '8px 15px', borderRadius: '20px' }}>
              📍 Location: <span>{selectedLoc === 'All Locations' ? 'All' : selectedLoc}</span>
            </button>
            <div className={`loc-popup ${locMenuOpen ? 'show' : ''}`} style={{ right: 0, top: 'calc(100% + 5px)', minWidth: '180px' }}>
              {['All Locations', 'JAMMU', 'KATHUA', 'POONCH', 'SAMBA'].map(loc => (
                <div 
                  key={loc} 
                  className={`loc-option ${selectedLoc === loc ? 'active' : ''}`}
                  onClick={() => { setSelectedLoc(loc); setLocMenuOpen(false); }}
                >
                  <div className="loc-dot"></div>{loc}
                </div>
              ))}
            </div>
          </div>



          {/* Service Type Dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { closeAllMenus(); setServMenuOpen(!servMenuOpen); }} className="tab active" style={{ padding: '8px 15px', borderRadius: '20px' }}>
              🛠️ Service Type: <span>{selectedServiceTypes.length === aggregatedData?.uniqueTypesList?.length ? 'All' : `${selectedServiceTypes.length} Selected`}</span>
            </button>
            <div className={`serv-type-popup ${servMenuOpen ? 'show' : ''}`} style={{ right: 0, top: 'calc(100% + 5px)', minWidth: '200px' }}>
              <div style={{ padding: '5px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent)', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedServiceTypes.length === aggregatedData?.uniqueTypesList?.length}
                    onChange={(e) => {
                      if (e.target.checked && aggregatedData) {
                        setSelectedServiceTypes([...aggregatedData.uniqueTypesList]);
                      } else {
                        setSelectedServiceTypes([]);
                      }
                    }}
                  /> Select All
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {aggregatedData?.uniqueTypesList?.map(t => (
                  <label key={t} className="serv-option" style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      value={t} 
                      checked={selectedServiceTypes.includes(t)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedServiceTypes(prev => [...prev, t]);
                        } else {
                          setSelectedServiceTypes(prev => prev.filter(item => item !== t));
                        }
                      }}
                    />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Date Picker Range Dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { closeAllMenus(); setDateMenuOpen(!dateMenuOpen); }} className="tab active" style={{ padding: '8px 15px', borderRadius: '20px' }}>
              📅 Date: <span>{startDate && endDate ? `${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}` : 'This Month'}</span>
            </button>
            <div className={`date-popup ${dateMenuOpen ? 'show' : ''}`} style={{ right: 0, top: 'calc(100% + 5px)', minWidth: '380px' }}>
              <div className="date-studio-content">
                <div className="date-sidebar">
                  <div onClick={() => setPresetRange('thisMonth')} className="date-sidebar-btn">This Month</div>
                  <div onClick={() => setPresetRange('lastMonth')} className="date-sidebar-btn">Last Month</div>
                  <div onClick={() => setPresetRange('ytd')} className="date-sidebar-btn">YTD</div>
                  <div onClick={() => setPresetRange('full')} className="date-sidebar-btn">Full History</div>
                </div>
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--subtext)', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      Custom Analysis Window
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="date" 
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        fontWeight: '600',
                        outline: 'none'
                      }}
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                    />
                    <input 
                      type="date" 
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        fontWeight: '600',
                        outline: 'none'
                      }}
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                    />
                  </div>
                  <button 
                    onClick={() => setDateMenuOpen(false)} 
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--navy)',
                      color: 'var(--navy-text)',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      marginTop: '15px',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Apply Selection Instantly
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Theme Studio Dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { closeAllMenus(); setThemeMenuOpen(!themeMenuOpen); }} className="tab active" style={{ padding: '8px 15px', borderRadius: '20px' }}>
              🎨 Theme Studio
            </button>
            <div className={`theme-popup ${themeMenuOpen ? 'show' : ''}`} style={{ right: 0, top: 'calc(100% + 5px)', minWidth: '250px' }}>
              <div className="theme-section">
                <h4>LIGHT THEMES</h4>
                <div className="theme-options">
                  {['standard', 'quartz', 'ivory', 'crystal'].map(t => (
                    <div key={t} className="theme-btn" onClick={() => { setTheme(t); setThemeMenuOpen(false); }}>
                      <div className="theme-dot" style={{ background: t === 'standard' ? '#f1f5f9' : t === 'quartz' ? '#f8fafc' : t === 'ivory' ? '#fdfcfb' : '#ffffff', borderLeft: '10px solid var(--navy)' }}></div>
                      <div className="theme-name" style={{ textTransform: 'capitalize' }}>{t}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="theme-section" style={{ marginBottom: 0 }}>
                <h4>DARK THEMES</h4>
                <div className="theme-options">
                  {['carbon', 'royal', 'neon', 'midnight'].map(t => (
                    <div key={t} className="theme-btn" onClick={() => { setTheme(t); setThemeMenuOpen(false); }}>
                      <div className="theme-dot" style={{ background: t === 'carbon' ? '#0f172a' : t === 'royal' ? '#0a0a0a' : t === 'neon' ? '#000000' : '#0c0a09', borderLeft: '10px solid var(--navy)' }}></div>
                      <div className="theme-name" style={{ textTransform: 'capitalize' }}>{t}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sync Data Trigger */}
          <button onClick={triggerSync} className="tab active" style={{ borderRadius: '20px', padding: '8px 15px' }}>
            🔄 Sync Live Data
          </button>
        </div>
      </div>

      {/* -------------------- SECTION 1: CY / LY TRENDS -------------------- */}
      {activeSection === 'trends' && aggregatedData && (
        <div id="section-trends">
          <div style={{ background: 'var(--navy)', color: 'var(--navy-text)', padding: '10px 20px', borderRadius: '8px', marginBottom: '15px', fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            Overall Service Performance
          </div>

          {/* Overall Load & Service Type Performance Tables */}
          <div className="grid-top">
            
            {/* Overall Load Card */}
            <div className={`card ${maximizedCard === 'cardOverall' ? 'fullscreen' : ''}`} id="cardOverall">
              <div className="card-header">
                <span>Overall Load</span>
                <span className="max-btn" onClick={() => toggleMax('cardOverall')}>
                  {maximizedCard === 'cardOverall' ? '⛶ Minimize' : '⛶ Maximize'}
                </span>
              </div>
              <div className="table-container" style={{ maxHeight: '250px' }}>
                <table>
                  <thead>
                    <tr>
                      <th rowSpan={2}>Location</th>
                      <th rowSpan={2}>TD</th>
                      <th colSpan={3}>{isMTD ? 'MTD' : 'RANGE'}</th>
                      <th colSpan={3}>QTD</th>
                      <th colSpan={3}>YTD</th>
                    </tr>
                    <tr>
                      <th>CY</th>
                      <th>LY</th>
                      <th>Growth</th>
                      <th>CY</th>
                      <th>LY</th>
                      <th>Growth</th>
                      <th>CY</th>
                      <th>LY</th>
                      <th>Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedData.locs.map(l => {
                      const mtdG = calcGrowth(l.rcy, l.rly);
                      const qtdG = calcGrowth(l.qcy, l.qly);
                      const ytdG = calcGrowth(l.ycy, l.yly);
                      return (
                        <tr key={l.Location}>
                          <td style={{ textAlign: 'left', fontWeight: '600' }}>{l.Location}</td>
                          <td>{formatNumber(l.td)}</td>
                          <td>{formatNumber(l.rcy)}</td>
                          <td>{formatNumber(l.rly)}</td>
                          <td><span className={getGrowthClass(mtdG)}>{mtdG}</span></td>
                          <td>{formatNumber(l.qcy)}</td>
                          <td>{formatNumber(l.qly)}</td>
                          <td><span className={getGrowthClass(qtdG)}>{qtdG}</span></td>
                          <td>{formatNumber(l.ycy)}</td>
                          <td>{formatNumber(l.yly)}</td>
                          <td><span className={getGrowthClass(ytdG)}>{ytdG}</span></td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="total-row">
                      <td style={{ textAlign: 'left', fontWeight: '600' }}>Total</td>
                      <td>{formatNumber(aggregatedData.total.td)}</td>
                      <td>{formatNumber(aggregatedData.total.rcy)}</td>
                      <td>{formatNumber(aggregatedData.total.rly)}</td>
                      <td><span className={getGrowthClass(calcGrowth(aggregatedData.total.rcy, aggregatedData.total.rly))}>{calcGrowth(aggregatedData.total.rcy, aggregatedData.total.rly)}</span></td>
                      <td>{formatNumber(aggregatedData.total.qcy)}</td>
                      <td>{formatNumber(aggregatedData.total.qly)}</td>
                      <td><span className={getGrowthClass(calcGrowth(aggregatedData.total.qcy, aggregatedData.total.qly))}>{calcGrowth(aggregatedData.total.qcy, aggregatedData.total.qly)}</span></td>
                      <td>{formatNumber(aggregatedData.total.ycy)}</td>
                      <td>{formatNumber(aggregatedData.total.yly)}</td>
                      <td><span className={getGrowthClass(calcGrowth(aggregatedData.total.ycy, aggregatedData.total.yly))}>{calcGrowth(aggregatedData.total.ycy, aggregatedData.total.yly)}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Load summary footer */}
              <div className="load-summary">
                <div className="sum-box">
                  <label>Yesterday Load</label>
                  <div className="val">{formatNumber(aggregatedData.total.td)}</div>
                </div>
                <div className="sum-box">
                  <label>{isMTD ? 'MTD Load' : 'RANGE Load'}</label>
                  <div className="val">
                    <span>{formatNumber(aggregatedData.total.rcy)}</span>
                    <span 
                      className={getGrowthClass(calcGrowth(aggregatedData.total.rcy, aggregatedData.total.rly))} 
                      style={{ marginLeft: '8px' }}
                    >
                      {calcGrowth(aggregatedData.total.rcy, aggregatedData.total.rly)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Type Performance Card */}
            <div className={`card ${maximizedCard === 'cardService' ? 'fullscreen' : ''}`} id="cardService">
              <div className="card-header">
                <span>Service Type Performance</span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button onClick={() => setPerfModalOpen(true)} className="tab active" style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', fontWeight: '700', borderRadius: '20px', fontSize: '10px' }}>
                    • Performance
                  </button>
                  <span className="max-btn" onClick={() => toggleMax('cardService')}>
                    {maximizedCard === 'cardService' ? '⛶ Minimize' : '⛶ Maximize'}
                  </span>
                </div>
              </div>

              {/* Service tabs */}
              <div className="tabs">
                <button onClick={() => setCurrentTrendTab('load')} className={`tab ${currentTrendTab === 'load' ? 'active' : ''}`}>Load Trend</button>
                <button onClick={() => setCurrentTrendTab('lab')} className={`tab ${currentTrendTab === 'lab' ? 'active' : ''}`}>Labour Trend</button>
                <button onClick={() => setCurrentTrendTab('part')} className={`tab ${currentTrendTab === 'part' ? 'active' : ''}`}>Parts Trend</button>
                <button onClick={() => setCurrentTrendTab('labEff')} className={`tab ${currentTrendTab === 'labEff' ? 'active' : ''}`}>Labour Per Vehicle Trend</button>
                <button onClick={() => setCurrentTrendTab('partEff')} className={`tab ${currentTrendTab === 'partEff' ? 'active' : ''}`}>Parts Per Vehicle Trend</button>
              </div>

              <div className="table-container" style={{ maxHeight: '310px' }}>
                <table>
                  <thead>
                    <tr>
                      <th rowSpan={2}>Service Type</th>
                      <th rowSpan={2}>TD</th>
                      <th colSpan={3}>{isMTD ? 'MTD' : 'RANGE'}</th>
                      <th colSpan={3}>QTD</th>
                      <th colSpan={3}>YTD</th>
                    </tr>
                    <tr>
                      <th>CY</th>
                      <th>LY</th>
                      <th>Growth</th>
                      <th>CY</th>
                      <th>LY</th>
                      <th>Growth</th>
                      <th>CY</th>
                      <th>LY</th>
                      <th>Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorizedServiceData && (
                      <>
                        {/* 1. Paid Services, Free Services, Running Repairs */}
                        {['Paid Services', 'Free Services', 'Running Repairs'].map(gn => {
                          const group = categorizedServiceData.groups[gn];
                          const rows = [renderServiceRow(group.totals, true, gn)];
                          if (trendExpandedGroups[gn] && group.items.length > 1) {
                            const sortedItems = [...group.items].sort((a, b) => (b.cy || 0) - (a.cy || 0));
                            sortedItems.forEach(item => {
                              rows.push(renderServiceRow(item, false));
                            });
                          }
                          return rows;
                        })}

                        {/* 2. MECH Row */}
                        <tr className="mech-total-row">
                          <td style={{ textAlign: 'left', fontWeight: '800' }}>MECH</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech1, 'td')}</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech1, 'rcy')}</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech1, 'rly')}</td>
                          <td><span className={getGrowthClass(getServiceGrowth(categorizedServiceData.mech1, 'rcy', 'rly'))}>{getServiceGrowth(categorizedServiceData.mech1, 'rcy', 'rly')}</span></td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech1, 'qcy')}</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech1, 'qly')}</td>
                          <td><span className={getGrowthClass(getServiceGrowth(categorizedServiceData.mech1, 'qcy', 'qly'))}>{getServiceGrowth(categorizedServiceData.mech1, 'qcy', 'qly')}</span></td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech1, 'ycy')}</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech1, 'yly')}</td>
                          <td><span className={getGrowthClass(getServiceGrowth(categorizedServiceData.mech1, 'ycy', 'yly'))}>{getServiceGrowth(categorizedServiceData.mech1, 'ycy', 'yly')}</span></td>
                        </tr>

                        {/* 3. Others Group */}
                        {(() => {
                          const group = categorizedServiceData.groups['Others'];
                          const rows = [renderServiceRow(group.totals, true, 'Others')];
                          if (trendExpandedGroups['Others'] && group.items.length > 1) {
                            const sortedItems = [...group.items].sort((a, b) => (b.cy || 0) - (a.cy || 0));
                            sortedItems.forEach(item => {
                              rows.push(renderServiceRow(item, false));
                            });
                          }
                          return rows;
                        })()}

                        {/* 4. MECH TOTAL Row */}
                        <tr className="mech-incl-row">
                          <td style={{ textAlign: 'left', fontWeight: '800' }}>MECH TOTAL</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech2, 'td')}</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech2, 'rcy')}</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech2, 'rly')}</td>
                          <td><span className={getGrowthClass(getServiceGrowth(categorizedServiceData.mech2, 'rcy', 'rly'))}>{getServiceGrowth(categorizedServiceData.mech2, 'rcy', 'rly')}</span></td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech2, 'qcy')}</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech2, 'qly')}</td>
                          <td><span className={getGrowthClass(getServiceGrowth(categorizedServiceData.mech2, 'qcy', 'qly'))}>{getServiceGrowth(categorizedServiceData.mech2, 'qcy', 'qly')}</span></td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech2, 'ycy')}</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.mech2, 'yly')}</td>
                          <td><span className={getGrowthClass(getServiceGrowth(categorizedServiceData.mech2, 'ycy', 'yly'))}>{getServiceGrowth(categorizedServiceData.mech2, 'ycy', 'yly')}</span></td>
                        </tr>

                        {/* 5. Accidental Group */}
                        {(() => {
                          const group = categorizedServiceData.groups['Accidental'];
                          const rows = [renderServiceRow(group.totals, true, 'Accidental', 'acc-total-row')];
                          if (trendExpandedGroups['Accidental'] && group.items.length > 1) {
                            const sortedItems = [...group.items].sort((a, b) => (b.cy || 0) - (a.cy || 0));
                            sortedItems.forEach(item => {
                              rows.push(renderServiceRow(item, false));
                            });
                          }
                          return rows;
                        })()}

                        {/* 6. Grand Total Row */}
                        <tr className="total-row">
                          <td style={{ textAlign: 'left', fontWeight: '600' }}>Grand Total</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.total, 'td')}</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.total, 'rcy')}</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.total, 'rly')}</td>
                          <td><span className={getGrowthClass(getServiceGrowth(categorizedServiceData.total, 'rcy', 'rly'))}>{getServiceGrowth(categorizedServiceData.total, 'rcy', 'rly')}</span></td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.total, 'qcy')}</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.total, 'qly')}</td>
                          <td><span className={getGrowthClass(getServiceGrowth(categorizedServiceData.total, 'qcy', 'qly'))}>{getServiceGrowth(categorizedServiceData.total, 'qcy', 'qly')}</span></td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.total, 'ycy')}</td>
                          <td>{formatServicePerformanceValue(categorizedServiceData.total, 'yly')}</td>
                          <td><span className={getGrowthClass(getServiceGrowth(categorizedServiceData.total, 'ycy', 'yly'))}>{getServiceGrowth(categorizedServiceData.total, 'ycy', 'yly')}</span></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div> {/* End grid-top */}



          {/* Workshop Performance Section (Day Wise Trend Chart) */}
          <div className={`card ${maximizedCard === 'cardDayTrend' ? 'fullscreen' : ''}`} id="cardDayTrend" style={{ marginBottom: '15px' }}>
            <div className="card-header">
              <span>Day Wise Trend (Current vs Last Year)</span>
              <span className="max-btn" onClick={() => toggleMax('cardDayTrend')}>
                {maximizedCard === 'cardDayTrend' ? '⛶ Minimize' : '⛶ Maximize'}
              </span>
            </div>

            {/* Mode selection tabs */}
            <div className="tabs" style={{ padding: '10px 15px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-start' }}>
              <button onClick={() => setCurrentTrendMode('load')} className={`tab ${currentTrendMode === 'load' ? 'active' : ''}`}>Load Trend</button>
              <button onClick={() => setCurrentTrendMode('lab')} className={`tab ${currentTrendMode === 'lab' ? 'active' : ''}`}>Labour Trend</button>
              <button onClick={() => setCurrentTrendMode('part')} className={`tab ${currentTrendMode === 'part' ? 'active' : ''}`}>Parts Trend</button>
              <button onClick={() => setCurrentTrendMode('lab_per')} className={`tab ${currentTrendMode === 'lab_per' ? 'active' : ''}`}>Labour Per Vehicle Trend</button>
              <button onClick={() => setCurrentTrendMode('part_per')} className={`tab ${currentTrendMode === 'part_per' ? 'active' : ''}`}>Parts Per Vehicle Trend</button>
            </div>

            {/* Recharts responsive Area chart */}
            <div className="chart-container" style={{ height: '350px', padding: '20px' }}>
              {processedDayTrends.length > 0 && (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <LineChart data={processedDayTrends} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="day" 
                      stroke="var(--subtext)" 
                      tickLine={false} 
                      tick={(props) => {
                        const { x, y, payload } = props;
                        const idx = parseInt(payload.value, 10) - 1;
                        const dayName = processedDayTrends[idx]?.dayName || '';
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={0} y={0} dy={12} textAnchor="middle" fill="var(--text)" fontSize={11} fontWeight={600}>{payload.value}</text>
                            <text x={0} y={0} dy={26} textAnchor="middle" fill="var(--subtext)" fontSize={10} fontWeight={500}>{dayName}</text>
                          </g>
                        );
                      }} 
                    />
                    <YAxis stroke="var(--subtext)" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }} 
                      formatter={(val) => [currentTrendMode === 'load' ? formatNumber(val) : formatCurrency(val), '']}
                    />
                    <Legend iconType="circle" />
                    {trendKpis && trendKpis.fullMonthTarget > 0 && (
                      <ReferenceLine 
                        y={trendKpis.fullMonthTarget / 30} 
                        stroke="#ef4444" 
                        strokeDasharray="4 4" 
                        strokeWidth={2}
                      />
                    )}
                    <Line type="linear" name="This Year" dataKey="cy" stroke="#1e3a8a" strokeWidth={3.5} dot={{ r: 5, strokeWidth: 2.5, fill: 'var(--card)' }} activeDot={{ r: 7 }}>
                      <LabelList dataKey="cy" position="top" style={{ fill: '#1e3a8a', fontSize: 11, fontWeight: 700 }} formatter={(val) => val > 0 ? (currentTrendMode === 'load' ? Math.round(val) : (val >= 100000 ? (val/100000).toFixed(1) + 'L' : val >= 1000 ? (val/1000).toFixed(1) + 'K' : Math.round(val))) : ''} />
                    </Line>
                    <Line type="linear" name="Last Year" dataKey="ly" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--card)' }} activeDot={{ r: 6 }}>
                      <LabelList dataKey="ly" position="bottom" style={{ fill: '#22c55e', fontSize: 11, fontWeight: 600 }} formatter={(val) => val > 0 ? (currentTrendMode === 'load' ? Math.round(val) : (val >= 100000 ? (val/100000).toFixed(1) + 'L' : val >= 1000 ? (val/1000).toFixed(1) + 'K' : Math.round(val))) : ''} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Target & Shortfall KPI Boxes */}
            {trendKpis && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', padding: '10px', background: 'var(--table-head)' }}>
                <div className="kpi-box">Month Target: <b>{trendKpis.isPerVehicle ? '₹' + Math.round(trendKpis.fullMonthTarget).toLocaleString() : trendKpis.isMoney ? formatCurrency(trendKpis.fullMonthTarget) : formatNumber(trendKpis.fullMonthTarget)}</b></div>
                <div className="kpi-box">MTD Target: <b>{trendKpis.isPerVehicle ? '₹' + Math.round(trendKpis.mtdTarget).toLocaleString() : trendKpis.isMoney ? formatCurrency(trendKpis.mtdTarget) : formatNumber(trendKpis.mtdTarget)}</b></div>
                <div className="kpi-box">Ach Till Date: <b>{trendKpis.isPerVehicle ? '₹' + Math.round(trendKpis.achieved).toLocaleString() : trendKpis.isMoney ? formatCurrency(trendKpis.achieved) : formatNumber(trendKpis.achieved)}</b></div>
                <div className="kpi-box">Shortfall T.D: <b style={{ color: 'var(--danger)' }}>{trendKpis.isPerVehicle ? '₹' + Math.round(trendKpis.shortfallTD).toLocaleString() : trendKpis.isMoney ? formatCurrency(trendKpis.shortfallTD) : formatNumber(trendKpis.shortfallTD)}</b></div>
                <div className="kpi-box">Monthly Shortfall: <b style={{ color: 'var(--danger)' }}>{trendKpis.isPerVehicle ? '₹' + Math.round(trendKpis.shortfallMonthly).toLocaleString() : trendKpis.isMoney ? formatCurrency(trendKpis.shortfallMonthly) : formatNumber(trendKpis.shortfallMonthly)}</b></div>
                <div className="kpi-box">Projected Closing: <b>{trendKpis.isPerVehicle ? '₹' + Math.round(trendKpis.projectedClosing).toLocaleString() : trendKpis.isMoney ? formatCurrency(trendKpis.projectedClosing) : formatNumber(trendKpis.projectedClosing)}</b></div>
                <div className="kpi-box">Asking Rate: <b>{trendKpis.isPerVehicle ? '₹' + Math.round(trendKpis.askingRate).toLocaleString() : trendKpis.isMoney ? formatCurrency(trendKpis.askingRate) : trendKpis.askingRate.toFixed(1)}</b></div>
              </div>
            )}
          </div>

          {/* Revenue Performance section */}
          <div style={{ background: 'var(--navy)', color: 'var(--navy-text)', padding: '10px 20px', borderRadius: '8px', margin: '15px 0', fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            Revenue Performance
          </div>

          <div className="grid-bottom" style={{ marginBottom: '20px' }}>
            {/* Labour Revenue Card */}
            <div className="card rev-card">
              <div className="card-header" style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Labour Revenue</div>
              <table className="horizontal-table" style={{ margin: '5px 0', width: '100%', fontSize: '10px' }}>
                <thead>
                  <tr>
                    <th rowSpan="2" style={{ verticalAlign: 'middle', borderBottom: '1px solid var(--border)' }}>Revenue</th>
                    <th colSpan="3" style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>MTD</th>
                    <th colSpan="3" style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>QTD</th>
                    <th colSpan="3" style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>YTD</th>
                  </tr>
                  <tr>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>CY</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>LY</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>%</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>CY</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>LY</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>%</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>CY</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>LY</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: '700' }}>Total</td>
                    
                    <td style={{ textAlign: 'center' }}>{formatCurrency(aggregatedData.total.lab_cy)}</td>
                    <td style={{ textAlign: 'center' }}>{formatCurrency(aggregatedData.total.lab_ly)}</td>
                    <td style={{ textAlign: 'center' }}><span className={getGrowthClass(calcGrowth(aggregatedData.total.lab_cy, aggregatedData.total.lab_ly))}>{calcGrowth(aggregatedData.total.lab_cy, aggregatedData.total.lab_ly)}</span></td>
                    
                    <td style={{ textAlign: 'center' }}>{formatCurrency(aggregatedData.total.lab_qcy)}</td>
                    <td style={{ textAlign: 'center' }}>{formatCurrency(aggregatedData.total.lab_qly)}</td>
                    <td style={{ textAlign: 'center' }}><span className={getGrowthClass(calcGrowth(aggregatedData.total.lab_qcy, aggregatedData.total.lab_qly))}>{calcGrowth(aggregatedData.total.lab_qcy, aggregatedData.total.lab_qly)}</span></td>
                    
                    <td style={{ textAlign: 'center' }}>{formatCurrency(aggregatedData.total.lab_ycy)}</td>
                    <td style={{ textAlign: 'center' }}>{formatCurrency(aggregatedData.total.lab_yly)}</td>
                    <td style={{ textAlign: 'center' }}><span className={getGrowthClass(calcGrowth(aggregatedData.total.lab_ycy, aggregatedData.total.lab_yly))}>{calcGrowth(aggregatedData.total.lab_ycy, aggregatedData.total.lab_yly)}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Part Revenue Card */}
            <div className="card rev-card">
              <div className="card-header" style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Part Revenue</div>
              <table className="horizontal-table" style={{ margin: '5px 0', width: '100%', fontSize: '10px' }}>
                <thead>
                  <tr>
                    <th rowSpan="2" style={{ verticalAlign: 'middle', borderBottom: '1px solid var(--border)' }}>Revenue</th>
                    <th colSpan="3" style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>MTD</th>
                    <th colSpan="3" style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>QTD</th>
                    <th colSpan="3" style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>YTD</th>
                  </tr>
                  <tr>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>CY</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>LY</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>%</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>CY</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>LY</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>%</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>CY</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>LY</th>
                    <th style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: '700' }}>Total</td>
                    
                    <td style={{ textAlign: 'center' }}>{formatCurrency(aggregatedData.total.part_cy)}</td>
                    <td style={{ textAlign: 'center' }}>{formatCurrency(aggregatedData.total.part_ly)}</td>
                    <td style={{ textAlign: 'center' }}><span className={getGrowthClass(calcGrowth(aggregatedData.total.part_cy, aggregatedData.total.part_ly))}>{calcGrowth(aggregatedData.total.part_cy, aggregatedData.total.part_ly)}</span></td>
                    
                    <td style={{ textAlign: 'center' }}>{formatCurrency(aggregatedData.total.part_qcy)}</td>
                    <td style={{ textAlign: 'center' }}>{formatCurrency(aggregatedData.total.part_qly)}</td>
                    <td style={{ textAlign: 'center' }}><span className={getGrowthClass(calcGrowth(aggregatedData.total.part_qcy, aggregatedData.total.part_qly))}>{calcGrowth(aggregatedData.total.part_qcy, aggregatedData.total.part_qly)}</span></td>
                    
                    <td style={{ textAlign: 'center' }}>{formatCurrency(aggregatedData.total.part_ycy)}</td>
                    <td style={{ textAlign: 'center' }}>{formatCurrency(aggregatedData.total.part_yly)}</td>
                    <td style={{ textAlign: 'center' }}><span className={getGrowthClass(calcGrowth(aggregatedData.total.part_ycy, aggregatedData.total.part_yly))}>{calcGrowth(aggregatedData.total.part_ycy, aggregatedData.total.part_yly)}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Growth Contribution */}
            <div className="card rev-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>Growth Contribution</div>
              <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', padding: '10px 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div className={calcGrowth(aggregatedData.total.rcy, aggregatedData.total.rly).includes('-') ? 'pill neg' : 'pill pos'} style={{ padding: '5px 15px', borderRadius: '20px', fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>
                    {calcGrowth(aggregatedData.total.rcy, aggregatedData.total.rly)}
                  </div>
                  <div style={{ background: 'var(--navy)', color: 'var(--navy-text)', padding: '4px 12px', borderRadius: '15px', fontSize: '9px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Load Growth
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  {categorizedServiceData && (
                    <>
                      <div className={getServiceGrowth(categorizedServiceData.groups['Paid Services'].totals, 'rcy', 'rly').includes('-') ? 'pill neg' : 'pill pos'} style={{ padding: '5px 15px', borderRadius: '20px', fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>
                        {getServiceGrowth(categorizedServiceData.groups['Paid Services'].totals, 'rcy', 'rly')}
                      </div>
                      <div style={{ background: 'var(--success)', color: 'var(--success-text)', padding: '4px 12px', borderRadius: '15px', fontSize: '9px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        Paid Growth
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Year Performance */}
          <div style={{ background: 'var(--navy)', color: 'var(--navy-text)', padding: '10px 20px', borderRadius: '8px', margin: '15px 0', fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            Financial Year Performance
          </div>

          <div className="card" id="cardFY" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <span>Historical FY Trends</span>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Trends</th>
                    {processedFyTrends && processedFyTrends.map(fy => (
                      <th key={fy.fy} style={{ textAlign: 'center' }}>{fy.fy}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Load</td>
                    {processedFyTrends && processedFyTrends.map(fy => (
                      <td key={fy.fy} style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: '600' }}>{formatNumber(fy.load)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Labour</td>
                    {processedFyTrends && processedFyTrends.map(fy => (
                      <td key={fy.fy} style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: '600' }}>{formatCurrency(fy.labour)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Part</td>
                    {processedFyTrends && processedFyTrends.map(fy => (
                      <td key={fy.fy} style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: '600' }}>{formatCurrency(fy.part)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Labour Per RO</td>
                    {processedFyTrends && processedFyTrends.map(fy => (
                      <td key={fy.fy} style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: '600' }}>{fy.load > 0 ? '₹' + Math.round(fy.labour / fy.load).toLocaleString('en-IN') : '₹0'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Parts Per RO</td>
                    {processedFyTrends && processedFyTrends.map(fy => (
                      <td key={fy.fy} style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: '600' }}>{fy.load > 0 ? '₹' + Math.round(fy.part / fy.load).toLocaleString('en-IN') : '₹0'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- SECTION 2: WORKSHOP PERFORMANCE (VAS) -------------------- */}
      {activeSection === 'vas' && aggregatedData && (
        <div id="section-vas" className={vasMaximized ? 'fullscreen' : ''}>
          <div style={{ background: 'var(--navy)', color: 'var(--navy-text)', padding: '10px 20px', borderRadius: '8px', marginBottom: '15px', fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><button onClick={() => setVasMaximized(!vasMaximized)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>{vasMaximized ? 'Minimize' : 'Maximize'}</button><span>WORKSHOP REVENUE ANALYSIS</span></span>
            
            {/* View selectors */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setVasViewMode(prev => prev === 'type' ? 'advisor' : 'type')} 
                className="tab active" 
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}
              >
                👤 Group: {vasViewMode === 'type' ? 'Service Type' : 'Advisor'}
              </button>
              <button 
                onClick={() => setVasTypeMode(prev => prev === 'MECH' ? 'ACC' : prev === 'ACC' ? 'BOTH' : 'MECH')} 
                className="tab active" 
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}
              >
                ⚙️ Mode: {vasTypeMode}
              </button>
              <button 
                onClick={() => setVasOpenRoMode(!vasOpenRoMode)} 
                className="tab active" 
                style={{ background: vasOpenRoMode ? 'var(--danger)' : '#2563eb', border: 'none', color: 'white', fontWeight: 'bold' }}
              >
                {vasOpenRoMode ? '📂 EXIT OPEN RO' : '📂 OPEN RO'}
              </button>
            </div>
          </div>

          
        {vasOpenRoMode ? (
            <div style={{ marginTop: '0' }}>
              <div className="card" style={{ marginTop: '0', borderTopLeftRadius: '0', borderTopRightRadius: '0' }}>
                <div style={{ background: 'var(--navy)', color: 'white', padding: '8px 20px', fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span>REVENUE PERFORMANCE (VAS / WA / WB)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => { closeAllMenus(); setStatusMenuOpen(!statusMenuOpen); }} style={{ padding: '4px 12px', borderRadius: '15px', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        📋 Status: <span style={{ fontWeight: 700 }}>{roStatusFilter}</span>
                      </button>
                      <div className={`loc-popup ${statusMenuOpen ? 'show' : ''}`} style={{ right: 0, top: 'calc(100% + 5px)', minWidth: '120px', backgroundColor: '#fff', color: '#333' }}>
                        {['All', 'Open', 'Closed'].map(status => (
                          <div 
                            key={status} 
                            className={`loc-option ${roStatusFilter === status ? 'active' : ''}`}
                            onClick={() => { setRoStatusFilter(status); setStatusMenuOpen(false); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            <div className="loc-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: roStatusFilter === status ? 'var(--accent)' : '#ccc' }}></div>{status}
                          </div>
                        ))}
                      </div>
                    </div>
                    <span style={{ fontWeight: 400 }}>Live Calculation from Main Data</span>
                  </div>
                </div>
                <div className="table-container" style={{ maxHeight: '60vh' }}>
                  <table>
                    <thead>
                      <tr>
                        <th rowSpan="2" style={{ verticalAlign: 'middle' }}>SERVICE TYPE</th>
                        <th rowSpan="2" style={{ verticalAlign: 'middle' }}>TOTAL WIP</th>
                        <th colSpan="4" style={{ textAlign: 'center' }}>AGING BUCKETS</th>
                        <th rowSpan="2" style={{ verticalAlign: 'middle' }}>AVG DAYS</th>
                      </tr>
                      <tr>
                        <th style={{ background: 'var(--success)', color: 'white', textAlign: 'center' }}>0-4D</th>
                        <th style={{ background: '#eab308', color: 'white', textAlign: 'center' }}>5-7D</th>
                        <th style={{ background: '#f97316', color: 'white', textAlign: 'center' }}>8-15D</th>
                        <th style={{ background: 'var(--danger)', color: 'white', textAlign: 'center' }}>&gt;15D</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Accident', 'Running Repairs', 'Paid Service', 'Free Services', 'Others'].map(st => {
                        const row = aggregatedOpenRo.byType[st];
                        if (!row || row.count === 0) return null;
                        const expanded = vasOpenRoExpandedGroups[st];
                        
                        return (
                          <React.Fragment key={st}>
                            <tr className="group-row" onClick={() => setVasOpenRoExpandedGroups(prev => ({...prev, [st]: !prev[st]}))} style={{ cursor: 'pointer' }}>
                              <td style={{ textAlign: 'center', fontWeight: '700' }}>
                                <span className={`group-icon ${expanded ? 'expanded' : ''}`} style={{ display: 'inline-block', width: '12px', transition: 'transform 0.2s', fontSize: '8px', marginRight: '5px', transform: expanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                                {st}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: '700' }}>{row.count}</td>
                              <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: '600' }}>{row.d0_4 > 0 ? row.d0_4 : 0}</td>
                              <td style={{ textAlign: 'center', color: '#eab308', fontWeight: '600' }}>{row.d5_7 > 0 ? row.d5_7 : 0}</td>
                              <td style={{ textAlign: 'center', color: '#f97316', fontWeight: '600' }}>{row.d8_15 > 0 ? row.d8_15 : 0}</td>
                              <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: '600' }}>{row.d15_plus > 0 ? row.d15_plus : 0}</td>
                              <td style={{ textAlign: 'center', fontWeight: '600' }}>{(row.totalDays / row.count).toFixed(1)}</td>
                            </tr>
                            {expanded && row.items.map(it => {
                               const textStr = `${it.delay_reason} Receiving Date : ${it.created_date?.value || it.created_date || '-'} PTD : - Claim date : - ${it.action_taken ? 'Action: '+it.action_taken : ''}`;
                               return (
                                  <tr key={it.jc_number} className="child-row" style={{ cursor: 'pointer' }} onClick={() => setSelectedVehicleDetails(it)}>
                                    <td style={{ textAlign: 'right', paddingRight: '20px', color: '#3b82f6', fontSize: '11px' }}>
                                      {it.reg_no} ({it.model})
                                    </td>
                                    <td colSpan="5" style={{ textAlign: 'left', fontSize: '10px', color: '#6b7280' }}>
                                      <span style={{ color: '#f59e0b', marginRight: '5px' }}>⚠️</span>
                                      {textStr}
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: '11px' }}>{it.open_days}D</td>
                                  </tr>
                               );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card" style={{ marginTop: '20px' }}>
                <div style={{ background: 'var(--navy)', color: 'white', padding: '10px 20px', fontSize: '13px', fontWeight: 700, borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>📉</span> JOB CARD DELAY REASON SUMMARY
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>JOB CARD DELAY REASON</th>
                        <th>MECH COUNT</th>
                        <th>ACC COUNT</th>
                        <th>0-4D</th>
                        <th>5-7D</th>
                        <th>8-15D</th>
                        <th>&gt;15D</th>
                        <th>TOTAL</th>
                        <th>AVG DAYS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregatedOpenRo.byReason.map(r => (
                        <tr key={r.reason}>
                          <td style={{ textAlign: 'left', fontWeight: '600', paddingLeft: '20px' }}>{r.reason}</td>
                          <td style={{ textAlign: 'center' }}>{r.mech}</td>
                          <td style={{ textAlign: 'center' }}>{r.acc}</td>
                          <td style={{ textAlign: 'center', color: 'var(--success)' }}>{r.d0_4}</td>
                          <td style={{ textAlign: 'center', color: '#eab308' }}>{r.d5_7}</td>
                          <td style={{ textAlign: 'center', color: '#f97316' }}>{r.d8_15}</td>
                          <td style={{ textAlign: 'center', color: 'var(--danger)' }}>{r.d15_plus}</td>
                          <td style={{ textAlign: 'center', fontWeight: '700' }}>{r.count}</td>
                          <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: '600' }}>{(r.totalDays / r.count).toFixed(1)}D</td>
                        </tr>
                      ))}
                      {aggregatedOpenRo.reasonTotalRow && (
                        <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                          <td style={{ textAlign: 'left', paddingLeft: '20px' }}>GRAND TOTAL</td>
                          <td style={{ textAlign: 'center' }}>{aggregatedOpenRo.reasonTotalRow.mech}</td>
                          <td style={{ textAlign: 'center' }}>{aggregatedOpenRo.reasonTotalRow.acc}</td>
                          <td style={{ textAlign: 'center' }}>{aggregatedOpenRo.reasonTotalRow.d0_4}</td>
                          <td style={{ textAlign: 'center' }}>{aggregatedOpenRo.reasonTotalRow.d5_7}</td>
                          <td style={{ textAlign: 'center' }}>{aggregatedOpenRo.reasonTotalRow.d8_15}</td>
                          <td style={{ textAlign: 'center' }}>{aggregatedOpenRo.reasonTotalRow.d15_plus}</td>
                          <td style={{ textAlign: 'center', color: '#3b82f6' }}>{aggregatedOpenRo.reasonTotalRow.mech + aggregatedOpenRo.reasonTotalRow.acc}</td>
                          <td style={{ textAlign: 'center', color: '#3b82f6' }}>{(aggregatedOpenRo.reasonTotalRow.totalDays / (aggregatedOpenRo.reasonTotalRow.mech + aggregatedOpenRo.reasonTotalRow.acc || 1)).toFixed(1)}D</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
        ) : (

          <div className="card" style={{ marginTop: '0', borderTopLeftRadius: '0', borderTopRightRadius: '0' }}>
            
            {/* Subheader */}
            <div style={{ background: 'var(--navy)', color: 'white', padding: '8px 20px', fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span>REVENUE PERFORMANCE (VAS / WA / WB)</span>
              <span style={{ fontWeight: 400 }}>Live Calculation from Main Data</span>
            </div>

            <div className="table-container" style={{ maxHeight: '70vh' }}>
              <table>
                <thead>
                  <tr>
                    <th>{vasViewMode === 'type' ? 'SERVICE TYPE' : 'SERVICE ADVISOR'}</th>
                    <th>TOTAL JC</th>
                    <th>TOTAL JC %</th>
                    <th>Labour Amt</th>
                    <th>LABOUR %</th>
                    <th>LABOUR/RO</th>
                    <th>LESS VAS.</th>
                    <th>VAS %</th>
                    <th>LAB/RO(-VAS)</th>
                    <th>LAB(-VAS)</th>
                    <th>Spare Sale</th>
                    <th>SPARE/RO</th>
                    <th>Discount</th>
                    <th>WA Count</th>
                    <th>WA AMT</th>
                    <th>WA/RO %</th>
                    <th>WB Count</th>
                    <th>WB AMT</th>
                    <th>WB/RO %</th>
                  </tr>
                </thead>
                <tbody>
                  
                  {/* Rendering advisor view mode */}
                  {vasViewMode === 'advisor' && vasTableData && vasTableData.sortedKeys.map(saName => {
                    const g = vasTableData.grouped[saName].totals;
                    const totJc = aggregatedData.total.cy || 1;
                    const totLab = aggregatedData.total.lab_cy || 1;
                    const expanded = vasExpandedGroups[saName];

                    return (
                      <>
                        <tr 
                          key={saName} 
                          className="group-row" 
                          onClick={() => setVasExpandedGroups(prev => ({ ...prev, [saName]: !prev[saName] }))}
                        >
                          <td style={{ textAlign: 'left', fontWeight: '700' }}>
                            <span className={`group-icon ${expanded ? 'expanded' : ''}`}>▶</span>{saName}
                          </td>
                          <td>{formatNumber(g.cy)}</td>
                          <td>{((g.cy / totJc) * 100).toFixed(0)}%</td>
                          <td>{formatCurrency(g.lab_cy)}</td>
                          <td>{((g.lab_cy / totLab) * 100).toFixed(0)}%</td>
                          <td>{g.cy > 0 ? '₹' + Math.round(g.lab_cy / g.cy).toLocaleString() : '₹0'}</td>
                          <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(g.vas_cy)}</td>
                          <td style={{ color: getPctColor(g.lab_cy > 0 ? ((g.vas_cy / g.lab_cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{g.lab_cy > 0 ? ((g.vas_cy / g.lab_cy) * 100).toFixed(0) : 0}%</td>
                          <td>{g.cy > 0 ? '₹' + Math.round((g.lab_cy - g.vas_cy) / g.cy).toLocaleString() : '₹0'}</td>
                          <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(g.lab_cy - g.vas_cy)}</td>
                          <td>{formatCurrency(g.part_cy)}</td>
                          <td>{g.cy > 0 ? '₹' + Math.round(g.part_cy / g.cy).toLocaleString() : '₹0'}</td>
                          <td style={{ color: 'var(--danger)', fontWeight: '700' }}>{formatCurrency(g.disc_cy)}</td>
                          <td>{formatNumber(g.wa_count_cy)}</td>
                          <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(g.wa_cy)}</td>
                          <td style={{ color: getPctColor(g.cy > 0 ? ((g.wa_count_cy / g.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{g.cy > 0 ? ((g.wa_count_cy / g.cy) * 100).toFixed(0) : 0}%</td>
                          <td>{formatNumber(g.wb_count_cy)}</td>
                          <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(g.wb_cy)}</td>
                          <td style={{ color: getPctColor(g.cy > 0 ? ((g.wb_count_cy / g.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{g.cy > 0 ? ((g.wb_count_cy / g.cy) * 100).toFixed(0) : 0}%</td>
                        </tr>
                        {expanded && vasTableData.grouped[saName].items.map(child => (
                          <tr key={child.Location} className="child-row">
                            <td style={{ textAlign: 'left', paddingLeft: '25px' }}>{child.Location}</td>
                            <td>{formatNumber(child.cy)}</td>
                            <td>{((child.cy / totJc) * 100).toFixed(0)}%</td>
                            <td>{formatCurrency(child.lab_cy)}</td>
                            <td>{((child.lab_cy / totLab) * 100).toFixed(0)}%</td>
                            <td>{child.cy > 0 ? '₹' + Math.round(child.lab_cy / child.cy).toLocaleString() : '₹0'}</td>
                            <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(child.vas_cy)}</td>
                            <td style={{ color: getPctColor(child.lab_cy > 0 ? ((child.vas_cy / child.lab_cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{child.lab_cy > 0 ? ((child.vas_cy / child.lab_cy) * 100).toFixed(0) : 0}%</td>
                            <td>{child.cy > 0 ? '₹' + Math.round((child.lab_cy - child.vas_cy) / child.cy).toLocaleString() : '₹0'}</td>
                            <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(child.lab_cy - child.vas_cy)}</td>
                            <td>{formatCurrency(child.part_cy)}</td>
                            <td>{child.cy > 0 ? '₹' + Math.round(child.part_cy / child.cy).toLocaleString() : '₹0'}</td>
                            <td style={{ color: 'var(--danger)', fontWeight: '700' }}>{formatCurrency(child.disc_cy)}</td>
                            <td>{formatNumber(child.wa_count_cy)}</td>
                            <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(child.wa_cy)}</td>
                            <td style={{ color: getPctColor(child.cy > 0 ? ((child.wa_count_cy / child.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{child.cy > 0 ? ((child.wa_count_cy / child.cy) * 100).toFixed(0) : 0}%</td>
                            <td>{formatNumber(child.wb_count_cy)}</td>
                            <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(child.wb_cy)}</td>
                            <td style={{ color: getPctColor(child.cy > 0 ? ((child.wb_count_cy / child.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{child.cy > 0 ? ((child.wb_count_cy / child.cy) * 100).toFixed(0) : 0}%</td>
                          </tr>
                        ))}
                      </>
                    );
                  })}

                  {/* Rendering standard category view mode */}
                  {vasViewMode === 'type' && vasTableData && (
                    <>
                      {['Paid Services', 'Free Services', 'Running Repairs'].map(gn => {
                        const g = vasTableData.grouped[gn].totals;
                        const totJc = aggregatedData.total.cy || 1;
                        const totLab = aggregatedData.total.lab_cy || 1;
                        const expanded = vasExpandedGroups[gn];

                        return (
                          <>
                            <tr 
                              key={gn} 
                              className="group-row" 
                              onClick={() => setVasExpandedGroups(prev => ({ ...prev, [gn]: !prev[gn] }))}
                            >
                              <td style={{ textAlign: 'left', fontWeight: '700' }}>
                                <span className={`group-icon ${expanded ? 'expanded' : ''}`}>▶</span>{gn}
                              </td>
                              <td>{formatNumber(g.cy)}</td>
                              <td>{((g.cy / totJc) * 100).toFixed(0)}%</td>
                              <td>{formatCurrency(g.lab_cy)}</td>
                              <td>{((g.lab_cy / totLab) * 100).toFixed(0)}%</td>
                              <td>{g.cy > 0 ? '₹' + Math.round(g.lab_cy / g.cy).toLocaleString() : '₹0'}</td>
                              <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(g.vas_cy)}</td>
                              <td style={{ color: getPctColor(g.lab_cy > 0 ? ((g.vas_cy / g.lab_cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{g.lab_cy > 0 ? ((g.vas_cy / g.lab_cy) * 100).toFixed(0) : 0}%</td>
                              <td>{g.cy > 0 ? '₹' + Math.round((g.lab_cy - g.vas_cy) / g.cy).toLocaleString() : '₹0'}</td>
                              <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(g.lab_cy - g.vas_cy)}</td>
                              <td>{formatCurrency(g.part_cy)}</td>
                              <td>{g.cy > 0 ? '₹' + Math.round(g.part_cy / g.cy).toLocaleString() : '₹0'}</td>
                              <td style={{ color: 'var(--danger)', fontWeight: '700' }}>{formatCurrency(g.disc_cy)}</td>
                              <td>{formatNumber(g.wa_count_cy)}</td>
                              <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(g.wa_cy)}</td>
                              <td style={{ color: getPctColor(g.cy > 0 ? ((g.wa_count_cy / g.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{g.cy > 0 ? ((g.wa_count_cy / g.cy) * 100).toFixed(0) : 0}%</td>
                              <td>{formatNumber(g.wb_count_cy)}</td>
                              <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(g.wb_cy)}</td>
                              <td style={{ color: getPctColor(g.cy > 0 ? ((g.wb_count_cy / g.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{g.cy > 0 ? ((g.wb_count_cy / g.cy) * 100).toFixed(0) : 0}%</td>
                            </tr>
                            {expanded && vasTableData.grouped[gn].items.map(child => (
                              <tr key={child.Location} className="child-row">
                                <td style={{ textAlign: 'left', paddingLeft: '25px' }}>{child.Location}</td>
                                <td>{formatNumber(child.cy)}</td>
                                <td>{((child.cy / totJc) * 100).toFixed(0)}%</td>
                                <td>{formatCurrency(child.lab_cy)}</td>
                                <td>{((child.lab_cy / totLab) * 100).toFixed(0)}%</td>
                                <td>{child.cy > 0 ? '₹' + Math.round(child.lab_cy / child.cy).toLocaleString() : '₹0'}</td>
                                <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(child.vas_cy)}</td>
                                <td style={{ color: getPctColor(child.lab_cy > 0 ? ((child.vas_cy / child.lab_cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{child.lab_cy > 0 ? ((child.vas_cy / child.lab_cy) * 100).toFixed(0) : 0}%</td>
                                <td>{child.cy > 0 ? '₹' + Math.round((child.lab_cy - child.vas_cy) / child.cy).toLocaleString() : '₹0'}</td>
                                <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(child.lab_cy - child.vas_cy)}</td>
                                <td>{formatCurrency(child.part_cy)}</td>
                                <td>{child.cy > 0 ? '₹' + Math.round(child.part_cy / child.cy).toLocaleString() : '₹0'}</td>
                                <td style={{ color: 'var(--danger)', fontWeight: '700' }}>{formatCurrency(child.disc_cy)}</td>
                                <td>{formatNumber(child.wa_count_cy)}</td>
                                <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(child.wa_cy)}</td>
                                <td style={{ color: getPctColor(child.cy > 0 ? ((child.wa_count_cy / child.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{child.cy > 0 ? ((child.wa_count_cy / child.cy) * 100).toFixed(0) : 0}%</td>
                                <td>{formatNumber(child.wb_count_cy)}</td>
                                <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(child.wb_cy)}</td>
                                <td style={{ color: getPctColor(child.cy > 0 ? ((child.wb_count_cy / child.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{child.cy > 0 ? ((child.wb_count_cy / child.cy) * 100).toFixed(0) : 0}%</td>
                              </tr>
                            ))}
                          </>
                        );
                      })}

                      {/* Mechanical subtotal */}
                      <tr className="mech-total-row">
                        <td style={{ textAlign: 'left', fontWeight: '800' }}>MECHANICAL TOTAL</td>
                        <td>{formatNumber(vasTableData.mech1.cy)}</td>
                        <td>{((vasTableData.mech1.cy / (aggregatedData.total.cy || 1)) * 100).toFixed(0)}%</td>
                        <td>{formatCurrency(vasTableData.mech1.lab_cy)}</td>
                        <td>{((vasTableData.mech1.lab_cy / (aggregatedData.total.lab_cy || 1)) * 100).toFixed(0)}%</td>
                        <td>{vasTableData.mech1.cy > 0 ? '₹' + Math.round(vasTableData.mech1.lab_cy / vasTableData.mech1.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.mech1.vas_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.mech1.lab_cy > 0 ? ((vasTableData.mech1.vas_cy / vasTableData.mech1.lab_cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.mech1.lab_cy > 0 ? ((vasTableData.mech1.vas_cy / vasTableData.mech1.lab_cy) * 100).toFixed(0) : 0}%</td>
                        <td>{vasTableData.mech1.cy > 0 ? '₹' + Math.round((vasTableData.mech1.lab_cy - vasTableData.mech1.vas_cy) / vasTableData.mech1.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.mech1.lab_cy - vasTableData.mech1.vas_cy)}</td>
                        <td>{formatCurrency(vasTableData.mech1.part_cy)}</td>
                        <td>{vasTableData.mech1.cy > 0 ? '₹' + Math.round(vasTableData.mech1.part_cy / vasTableData.mech1.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: '700' }}>{formatCurrency(vasTableData.mech1.disc_cy)}</td>
                        <td>{formatNumber(vasTableData.mech1.wa_count_cy)}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.mech1.wa_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.mech1.cy > 0 ? ((vasTableData.mech1.wa_count_cy / vasTableData.mech1.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.mech1.cy > 0 ? ((vasTableData.mech1.wa_count_cy / vasTableData.mech1.cy) * 100).toFixed(0) : 0}%</td>
                        <td>{formatNumber(vasTableData.mech1.wb_count_cy)}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.mech1.wb_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.mech1.cy > 0 ? ((vasTableData.mech1.wb_count_cy / vasTableData.mech1.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.mech1.cy > 0 ? ((vasTableData.mech1.wb_count_cy / vasTableData.mech1.cy) * 100).toFixed(0) : 0}%</td>
                      </tr>

                      {/* Others Row */}
                      <tr className="group-row" onClick={() => setVasExpandedGroups(prev => ({ ...prev, Others: !prev.Others }))}>
                        <td style={{ textAlign: 'left', fontWeight: '700' }}>
                          <span className={`group-icon ${vasExpandedGroups.Others ? 'expanded' : ''}`}>▶</span>Others
                        </td>
                        <td>{formatNumber(vasTableData.grouped['Others'].totals.cy)}</td>
                        <td>{((vasTableData.grouped['Others'].totals.cy / (aggregatedData.total.cy || 1)) * 100).toFixed(0)}%</td>
                        <td>{formatCurrency(vasTableData.grouped['Others'].totals.lab_cy)}</td>
                        <td>{((vasTableData.grouped['Others'].totals.lab_cy / (aggregatedData.total.lab_cy || 1)) * 100).toFixed(0)}%</td>
                        <td>{vasTableData.grouped['Others'].totals.cy > 0 ? '₹' + Math.round(vasTableData.grouped['Others'].totals.lab_cy / vasTableData.grouped['Others'].totals.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.grouped['Others'].totals.vas_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.grouped['Others'].totals.lab_cy > 0 ? ((vasTableData.grouped['Others'].totals.vas_cy / vasTableData.grouped['Others'].totals.lab_cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.grouped['Others'].totals.lab_cy > 0 ? ((vasTableData.grouped['Others'].totals.vas_cy / vasTableData.grouped['Others'].totals.lab_cy) * 100).toFixed(0) : 0}%</td>
                        <td>{vasTableData.grouped['Others'].totals.cy > 0 ? '₹' + Math.round((vasTableData.grouped['Others'].totals.lab_cy - vasTableData.grouped['Others'].totals.vas_cy) / vasTableData.grouped['Others'].totals.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.grouped['Others'].totals.lab_cy - vasTableData.grouped['Others'].totals.vas_cy)}</td>
                        <td>{formatCurrency(vasTableData.grouped['Others'].totals.part_cy)}</td>
                        <td>{vasTableData.grouped['Others'].totals.cy > 0 ? '₹' + Math.round(vasTableData.grouped['Others'].totals.part_cy / vasTableData.grouped['Others'].totals.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: '700' }}>{formatCurrency(vasTableData.grouped['Others'].totals.disc_cy)}</td>
                        <td>{formatNumber(vasTableData.grouped['Others'].totals.wa_count_cy)}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.grouped['Others'].totals.wa_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.grouped['Others'].totals.cy > 0 ? ((vasTableData.grouped['Others'].totals.wa_count_cy / vasTableData.grouped['Others'].totals.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.grouped['Others'].totals.cy > 0 ? ((vasTableData.grouped['Others'].totals.wa_count_cy / vasTableData.grouped['Others'].totals.cy) * 100).toFixed(0) : 0}%</td>
                        <td>{formatNumber(vasTableData.grouped['Others'].totals.wb_count_cy)}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.grouped['Others'].totals.wb_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.grouped['Others'].totals.cy > 0 ? ((vasTableData.grouped['Others'].totals.wb_count_cy / vasTableData.grouped['Others'].totals.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.grouped['Others'].totals.cy > 0 ? ((vasTableData.grouped['Others'].totals.wb_count_cy / vasTableData.grouped['Others'].totals.cy) * 100).toFixed(0) : 0}%</td>
                      </tr>

                      {/* Mech Total (Incl. Others) row */}
                      <tr className="mech-incl-row">
                        <td style={{ textAlign: 'left', fontWeight: '800' }}>MECHANICAL TOTAL (INCL. OTHERS)</td>
                        <td>{formatNumber(vasTableData.mech2.cy)}</td>
                        <td>{((vasTableData.mech2.cy / (aggregatedData.total.cy || 1)) * 100).toFixed(0)}%</td>
                        <td>{formatCurrency(vasTableData.mech2.lab_cy)}</td>
                        <td>{((vasTableData.mech2.lab_cy / (aggregatedData.total.lab_cy || 1)) * 100).toFixed(0)}%</td>
                        <td>{vasTableData.mech2.cy > 0 ? '₹' + Math.round(vasTableData.mech2.lab_cy / vasTableData.mech2.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.mech2.vas_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.mech2.lab_cy > 0 ? ((vasTableData.mech2.vas_cy / vasTableData.mech2.lab_cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.mech2.lab_cy > 0 ? ((vasTableData.mech2.vas_cy / vasTableData.mech2.lab_cy) * 100).toFixed(0) : 0}%</td>
                        <td>{vasTableData.mech2.cy > 0 ? '₹' + Math.round((vasTableData.mech2.lab_cy - vasTableData.mech2.vas_cy) / vasTableData.mech2.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.mech2.lab_cy - vasTableData.mech2.vas_cy)}</td>
                        <td>{formatCurrency(vasTableData.mech2.part_cy)}</td>
                        <td>{vasTableData.mech2.cy > 0 ? '₹' + Math.round(vasTableData.mech2.part_cy / vasTableData.mech2.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: '700' }}>{formatCurrency(vasTableData.mech2.disc_cy)}</td>
                        <td>{formatNumber(vasTableData.mech2.wa_count_cy)}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.mech2.wa_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.mech2.cy > 0 ? ((vasTableData.mech2.wa_count_cy / vasTableData.mech2.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.mech2.cy > 0 ? ((vasTableData.mech2.wa_count_cy / vasTableData.mech2.cy) * 100).toFixed(0) : 0}%</td>
                        <td>{formatNumber(vasTableData.mech2.wb_count_cy)}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.mech2.wb_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.mech2.cy > 0 ? ((vasTableData.mech2.wb_count_cy / vasTableData.mech2.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.mech2.cy > 0 ? ((vasTableData.mech2.wb_count_cy / vasTableData.mech2.cy) * 100).toFixed(0) : 0}%</td>
                      </tr>

                      {/* Accidental Row */}
                      <tr className="group-row acc-total-row" onClick={() => setVasExpandedGroups(prev => ({ ...prev, Accidental: !prev.Accidental }))}>
                        <td style={{ textAlign: 'left', fontWeight: '800' }}>
                          <span className={`group-icon ${vasExpandedGroups.Accidental ? 'expanded' : ''}`}>▶</span>ACCIDENTAL
                        </td>
                        <td>{formatNumber(vasTableData.grouped['Accidental'].totals.cy)}</td>
                        <td>{((vasTableData.grouped['Accidental'].totals.cy / (aggregatedData.total.cy || 1)) * 100).toFixed(0)}%</td>
                        <td>{formatCurrency(vasTableData.grouped['Accidental'].totals.lab_cy)}</td>
                        <td>{((vasTableData.grouped['Accidental'].totals.lab_cy / (aggregatedData.total.lab_cy || 1)) * 100).toFixed(0)}%</td>
                        <td>{vasTableData.grouped['Accidental'].totals.cy > 0 ? '₹' + Math.round(vasTableData.grouped['Accidental'].totals.lab_cy / vasTableData.grouped['Accidental'].totals.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.grouped['Accidental'].totals.vas_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.grouped['Accidental'].totals.lab_cy > 0 ? ((vasTableData.grouped['Accidental'].totals.vas_cy / vasTableData.grouped['Accidental'].totals.lab_cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.grouped['Accidental'].totals.lab_cy > 0 ? ((vasTableData.grouped['Accidental'].totals.vas_cy / vasTableData.grouped['Accidental'].totals.lab_cy) * 100).toFixed(0) : 0}%</td>
                        <td>{vasTableData.grouped['Accidental'].totals.cy > 0 ? '₹' + Math.round((vasTableData.grouped['Accidental'].totals.lab_cy - vasTableData.grouped['Accidental'].totals.vas_cy) / vasTableData.grouped['Accidental'].totals.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.grouped['Accidental'].totals.lab_cy - vasTableData.grouped['Accidental'].totals.vas_cy)}</td>
                        <td>{formatCurrency(vasTableData.grouped['Accidental'].totals.part_cy)}</td>
                        <td>{vasTableData.grouped['Accidental'].totals.cy > 0 ? '₹' + Math.round(vasTableData.grouped['Accidental'].totals.part_cy / vasTableData.grouped['Accidental'].totals.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: '700' }}>{formatCurrency(vasTableData.grouped['Accidental'].totals.disc_cy)}</td>
                        <td>{formatNumber(vasTableData.grouped['Accidental'].totals.wa_count_cy)}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.grouped['Accidental'].totals.wa_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.grouped['Accidental'].totals.cy > 0 ? ((vasTableData.grouped['Accidental'].totals.wa_count_cy / vasTableData.grouped['Accidental'].totals.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.grouped['Accidental'].totals.cy > 0 ? ((vasTableData.grouped['Accidental'].totals.wa_count_cy / vasTableData.grouped['Accidental'].totals.cy) * 100).toFixed(0) : 0}%</td>
                        <td>{formatNumber(vasTableData.grouped['Accidental'].totals.wb_count_cy)}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.grouped['Accidental'].totals.wb_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.grouped['Accidental'].totals.cy > 0 ? ((vasTableData.grouped['Accidental'].totals.wb_count_cy / vasTableData.grouped['Accidental'].totals.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.grouped['Accidental'].totals.cy > 0 ? ((vasTableData.grouped['Accidental'].totals.wb_count_cy / vasTableData.grouped['Accidental'].totals.cy) * 100).toFixed(0) : 0}%</td>
                      </tr>

                      {/* Grand Total Row */}
                      <tr className="total-row">
                        <td style={{ textAlign: 'left', fontWeight: '600' }}>GRAND TOTAL</td>
                        <td>{formatNumber(vasTableData.totals.cy)}</td>
                        <td>100%</td>
                        <td>{formatCurrency(vasTableData.totals.lab_cy)}</td>
                        <td>100%</td>
                        <td>{vasTableData.totals.cy > 0 ? '₹' + Math.round(vasTableData.totals.lab_cy / vasTableData.totals.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.totals.vas_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.totals.lab_cy > 0 ? ((vasTableData.totals.vas_cy / vasTableData.totals.lab_cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.totals.lab_cy > 0 ? ((vasTableData.totals.vas_cy / vasTableData.totals.lab_cy) * 100).toFixed(0) : 0}%</td>
                        <td>{vasTableData.totals.cy > 0 ? '₹' + Math.round((vasTableData.totals.lab_cy - vasTableData.totals.vas_cy) / vasTableData.totals.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.totals.lab_cy - vasTableData.totals.vas_cy)}</td>
                        <td>{formatCurrency(vasTableData.totals.part_cy)}</td>
                        <td>{vasTableData.totals.cy > 0 ? '₹' + Math.round(vasTableData.totals.part_cy / vasTableData.totals.cy).toLocaleString() : '₹0'}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: '700' }}>{formatCurrency(vasTableData.totals.disc_cy)}</td>
                        <td>{formatNumber(vasTableData.totals.wa_count_cy)}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.totals.wa_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.totals.cy > 0 ? ((vasTableData.totals.wa_count_cy / vasTableData.totals.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.totals.cy > 0 ? ((vasTableData.totals.wa_count_cy / vasTableData.totals.cy) * 100).toFixed(0) : 0}%</td>
                        <td>{formatNumber(vasTableData.totals.wb_count_cy)}</td>
                        <td style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(vasTableData.totals.wb_cy)}</td>
                        <td style={{ color: getPctColor(vasTableData.totals.cy > 0 ? ((vasTableData.totals.wb_count_cy / vasTableData.totals.cy) * 100).toFixed(0) : 0), fontWeight: '600' }}>{vasTableData.totals.cy > 0 ? ((vasTableData.totals.wb_count_cy / vasTableData.totals.cy) * 100).toFixed(0) : 0}%</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* Location Summary Table */}
          <div className="card" style={{ marginBottom: '15px', borderTopLeftRadius: '0', borderTopRightRadius: '0' }}>
            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>LOCATION</th>
                    <th>TOTAL LOAD</th>
                    <th>EW</th>
                    <th>EW %</th>
                    <th>RSA</th>
                    <th>RSA %</th>
                    <th>AMC</th>
                    <th>AMC%</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedData && aggregatedData.locs ? aggregatedData.locs.map(loc => {
                    const totalLoad = loc.cy || 0;
                    const ewCount = opsEwSummary.filter(e => e.division === loc.Location).reduce((acc, curr) => acc + (curr.total_contracts || 0), 0);
                    const amcCount = opsAmcSummary.filter(a => a.division === loc.Location).reduce((acc, curr) => acc + (curr.total_contracts || 0), 0);
                    const rsaCount = opsRsaSummary.filter(r => r.division === loc.Location).reduce((acc, curr) => acc + (curr.total_contracts || 0), 0);
                    const ewPct = totalLoad > 0 ? ((ewCount / totalLoad) * 100).toFixed(0) : 0;
                    const amcPct = totalLoad > 0 ? ((amcCount / totalLoad) * 100).toFixed(0) : 0;
                    const rsaPct = totalLoad > 0 ? ((rsaCount / totalLoad) * 100).toFixed(0) : 0;
                    return (
                    <tr key={loc.Location} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ textAlign: 'left', fontWeight: 'bold', color: 'black' }}>{loc.Location}</td>
                      <td>{formatNumber(totalLoad)}</td>
                      <td>{formatNumber(ewCount)}</td>
                      <td style={{ color: getPctColor(ewPct), fontWeight: 'bold' }}>{ewPct}%</td>
                      <td>{formatNumber(rsaCount)}</td>
                      <td style={{ color: getPctColor(rsaPct), fontWeight: 'bold' }}>{rsaPct}%</td>
                      <td>{formatNumber(amcCount)}</td>
                      <td style={{ color: getPctColor(amcPct), fontWeight: 'bold' }}>{amcPct}%</td>
                    </tr>
                    );
                  }) : ['JAMMU', 'KATHUA', 'SAMBA', 'POONCH'].map(loc => (
                    <tr key={loc} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ textAlign: 'left', fontWeight: 'bold', color: 'black' }}>{loc}</td>
                      <td>0</td>
                      <td>0</td>
                      <td>0%</td>
                      <td>0</td>
                      <td>0%</td>
                      <td>0</td>
                      <td>0%</td>
                    </tr>
                  ))}
                  {aggregatedData && aggregatedData.total ? (() => {
                    const totalLoad = aggregatedData.total.cy || 0;
                    const ewCount = opsEwSummary.reduce((acc, curr) => acc + (curr.total_contracts || 0), 0);
                    const amcCount = opsAmcSummary.reduce((acc, curr) => acc + (curr.total_contracts || 0), 0);
                    const rsaCount = opsRsaSummary.reduce((acc, curr) => acc + (curr.total_contracts || 0), 0);
                    const ewPct = totalLoad > 0 ? ((ewCount / totalLoad) * 100).toFixed(0) : 0;
                    const amcPct = totalLoad > 0 ? ((amcCount / totalLoad) * 100).toFixed(0) : 0;
                    const rsaPct = totalLoad > 0 ? ((rsaCount / totalLoad) * 100).toFixed(0) : 0;
                    return (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ textAlign: 'left', fontWeight: 'bold', color: 'black' }}>GTOTAL</td>
                      <td style={{ fontWeight: 'bold' }}>{formatNumber(totalLoad)}</td>
                      <td style={{ fontWeight: 'bold' }}>{formatNumber(ewCount)}</td>
                      <td style={{ color: getPctColor(ewPct), fontWeight: 'bold' }}>{ewPct}%</td>
                      <td style={{ fontWeight: 'bold' }}>{formatNumber(rsaCount)}</td>
                      <td style={{ color: getPctColor(rsaPct), fontWeight: 'bold' }}>{rsaPct}%</td>
                      <td style={{ fontWeight: 'bold' }}>{formatNumber(amcCount)}</td>
                      <td style={{ color: getPctColor(amcPct), fontWeight: 'bold' }}>{amcPct}%</td>
                    </tr>
                    );
                  })() : null}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}

      {/* -------------------- SECTION 3: WORKSHOP OPERATIONS (OPS BACKLOGS) -------------------- */}
      {activeSection === 'ops' && (
        <div id="section-ops">
          <div style={{ background: 'var(--navy)', color: 'var(--navy-text)', padding: '10px 20px', borderRadius: '8px', marginBottom: '15px', fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Workshop Operations Dashboard</span>
            <button onClick={fetchOperationsData} className="tab active" style={{ background: 'var(--accent)', color: 'white', border: 'none' }}>
              🔄 Refresh Lists
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            
            {/* Open RO Backlog Card */}
            <div className="card">
              <div className="card-header">
                <span>Active Open Repair Orders Backlog ({opsOpenRos.length} Cases)</span>
              </div>
              <div className="table-container" style={{ maxHeight: '300px' }}>
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
                    {opsOpenRos.map(ro => (
                      <tr key={ro.jc_number}>
                        <td style={{ fontWeight: '700', color: 'var(--navy)' }}>{ro.jc_number}</td>
                        <td>{formatDateDisplay(ro.created_date?.value || ro.created_date)}</td>
                        <td>{ro.model}</td>
                        <td>{ro.reg_no}</td>
                        <td>{ro.division}</td>
                        <td>{ro.service_type}</td>
                        <td>
                          <span className={`pill ${ro.open_days > 15 ? 'neg' : ro.open_days > 7 ? 'pos' : ''}`} style={{ fontWeight: 'bold' }}>
                            {ro.open_days} Days
                          </span>
                        </td>
                        <td>{ro.delay_reason}</td>
                        <td>{ro.action_taken}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Roadside Memberships Card */}
            <div className="card">
              <div className="card-header">
                <span>Active Roadside Memberships (RSA)</span>
              </div>
              <div className="table-container" style={{ maxHeight: '250px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Start Date</th>
                      <th>Agreement Program</th>
                      <th>Dealer Name</th>
                      <th>Status</th>
                      <th>Registration No</th>
                      <th>Chassis Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opsMemberships.map((m, idx) => (
                      <tr key={idx}>
                        <td>{formatDateDisplay(m.start_date?.value || m.start_date) || '-'}</td>
                        <td style={{ fontWeight: '600' }}>{m.program_name}</td>
                        <td>{m.dealer}</td>
                        <td>
                          <span className={`pill ${m.status === 'Active' ? 'pos' : 'neg'}`}>{m.status || 'Active'}</span>
                        </td>
                        <td>{m.reg_no}</td>
                        <td>{m.chassis_no}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AMC Contracts Card */}
            <div className="card">
              <div className="card-header">
                <span>Recent Annual Maintenance Contracts (AMC)</span>
              </div>
              <div className="table-container" style={{ maxHeight: '250px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Start Date</th>
                      <th>Contract No</th>
                      <th>Model</th>
                      <th>Division</th>
                      <th>Amount Collected</th>
                      <th>Chassis Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opsAmc.map((amc, idx) => (
                      <tr key={idx}>
                        <td>{formatDateDisplay(amc.start_date?.value || amc.start_date)}</td>
                        <td style={{ fontWeight: '600' }}>{amc.contract_no}</td>
                        <td>{amc.model}</td>
                        <td>{amc.division}</td>
                        <td style={{ fontWeight: '700', color: 'var(--accent)' }}>{formatCurrency(amc.amount)}</td>
                        <td>{amc.chassis_no}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Extended Warranty Card */}
            <div className="card">
              <div className="card-header">
                <span>Recent Extended Warranty sales (EW)</span>
              </div>
              <div className="table-container" style={{ maxHeight: '250px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Sale Date</th>
                      <th>Product Program</th>
                      <th>Division</th>
                      <th>Price Charged</th>
                      <th>Dealer Margin</th>
                      <th>Chassis Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opsEw.map((ew, idx) => (
                      <tr key={idx}>
                        <td>{formatDateDisplay(ew.sale_date?.value || ew.sale_date)}</td>
                        <td style={{ fontWeight: '600' }}>{ew.product_name}</td>
                        <td>{ew.division}</td>
                        <td style={{ fontWeight: '700', color: 'var(--accent)' }}>{formatCurrency(ew.price)}</td>
                        <td style={{ color: 'var(--success)' }}>{formatCurrency(ew.margin)}</td>
                        <td>{ew.chassis_no}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* -------------------- FORENSIC AUDIT / PERFORMANCE MODAL -------------------- */}
      {perfModalOpen && (
        <div id="performanceModal" className="perf-modal">
          <div className="perf-header">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <h2 style={{ fontSize: '22px', letterSpacing: '-0.5px' }}>🔍 Performance Intelligence Report</h2>
              <span style={{ fontSize: '13px', opacity: 0.9, fontWeight: '400' }}>
                Analysis Window: This Month
              </span>
            </div>
            <button className="close-perf" onClick={() => setPerfModalOpen(false)}>Exit Studio</button>
          </div>

          {/* Forensics Stats Row */}
          <div className="perf-stats">
            <div className="perf-stat-card"><label>TOTAL RECORDS</label><span>{formatNumber(forensicsSummary?.total_checked || 0)}</span></div>
            <div className="perf-stat-card"><label>FILTERED TRANSACTIONS</label><span>{formatNumber(filteredForensicsList.length)}</span></div>
            <div className="perf-stat-card"><label>ALERTS FOUND</label><span style={{ color: 'var(--danger)' }}>{formatNumber(forensicsSummary?.total_rework + forensicsSummary?.total_leak_alerts + forensicsSummary?.total_discount_alerts)}</span></div>
            <div className="perf-stat-card" style={{ borderLeft: '4px solid var(--accent)' }}><label>AVG ADVISOR SCORE</label><span style={{ color: 'var(--accent)' }}>{forensicsSummary?.avg_global_score || 0}</span></div>
            
            <div className="perf-stat-card" style={{ background: 'var(--navy)', color: 'white', cursor: 'pointer' }} onClick={() => setScoringRulesOpen(true)}>
              <label style={{ color: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontWeight: 700 }}>SCORING RULE</label>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'white' }}>📜 View Rules</span>
            </div>
            
            <div className="perf-stat-card" style={{ background: '#22c55e', color: 'white', cursor: 'pointer', minWidth: '90px' }} onClick={handleDownloadCSV}>
              <label style={{ color: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontWeight: 800 }}>EXCEL</label>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'white' }}>📊 Download</span>
            </div>
            
            <div className="perf-stat-card" style={{ background: '#ef4444', color: 'white', cursor: 'pointer', minWidth: '90px' }} onClick={handleDownloadPDF}>
              <label style={{ color: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontWeight: 800 }}>PDF</label>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'white' }}>📄 Download</span>
            </div>

            <div className="perf-stat-card clickable-stat" style={{ background: '#f8fafc', minWidth: '105px' }} onClick={() => setPerfFilterAlert(prev => prev === 'Rework' ? 'All' : 'Rework')}>
              <label style={{ fontSize: '9px', cursor: 'pointer', textTransform: 'uppercase' }}>30-Day Rework</label>
              <span style={{ fontSize: '14px', color: '#ef4444' }}>{formatNumber(forensicsSummary?.total_rework || 0)}</span>
            </div>
            <div className="perf-stat-card clickable-stat" style={{ background: '#f8fafc', minWidth: '105px' }} onClick={() => setPerfFilterAlert(prev => prev === 'Discount' ? 'All' : 'Discount')}>
              <label style={{ fontSize: '9px', cursor: 'pointer', textTransform: 'uppercase' }}>Manual Discount</label>
              <span style={{ fontSize: '14px', color: '#ef4444' }}>{formatNumber(forensicsSummary?.total_discount_alerts || 0)}</span>
            </div>
            <div className="perf-stat-card clickable-stat" style={{ background: '#f8fafc', minWidth: '105px' }} onClick={() => setPerfFilterAlert(prev => prev === 'Leak' ? 'All' : 'Leak')}>
              <label style={{ fontSize: '9px', cursor: 'pointer', textTransform: 'uppercase' }}>Labour Leakage</label>
              <span style={{ fontSize: '14px', color: '#ef4444' }}>{formatNumber(forensicsSummary?.total_leak_alerts || 0)}</span>
            </div>
          </div>
          <div className="perf-stats" style={{ marginTop: '10px', justifyContent: 'flex-start' }}>
            <div className="perf-stat-card clickable-stat" style={{ background: '#f8fafc', minWidth: '105px' }} onClick={() => setPerfFilterAlert(prev => prev === 'LowLabourGlobal' ? 'All' : 'LowLabourGlobal')}>
              <label style={{ fontSize: '9px', cursor: 'pointer', textTransform: 'uppercase' }}>Low Lab (W)</label>
              <span style={{ fontSize: '14px', color: '#ef4444' }}>{formatNumber(forensicsSummary?.total_low_lab_global || 0)}</span>
            </div>
            <div className="perf-stat-card clickable-stat" style={{ background: '#f8fafc', minWidth: '105px' }} onClick={() => setPerfFilterAlert(prev => prev === 'LowPartGlobal' ? 'All' : 'LowPartGlobal')}>
              <label style={{ fontSize: '9px', cursor: 'pointer', textTransform: 'uppercase' }}>Low Part (W)</label>
              <span style={{ fontSize: '14px', color: '#ef4444' }}>{formatNumber(forensicsSummary?.total_low_part_global || 0)}</span>
            </div>
          </div>

          {/* Forensics Filters Toolbar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '15px', marginBottom: '20px', background: 'var(--card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--subtext)', marginBottom: '8px' }}>SEARCH REG</label>
              <input type="text" style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} placeholder="Search Registration..." value={perfSearchReg} onChange={(e) => setPerfSearchReg(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--subtext)', marginBottom: '8px' }}>BRANCH</label>
              <select style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} value={perfFilterLoc} onChange={(e) => setPerfFilterLoc(e.target.value)}>
                <option value="All">All Locations</option>
                {forensicsLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--subtext)', marginBottom: '8px' }}>SERVICE TYPE</label>
              <select style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} value={perfFilterType} onChange={(e) => setPerfFilterType(e.target.value)}>
                <option value="All">All Types</option>
                {forensicsServiceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--subtext)', marginBottom: '8px' }}>ADVISOR</label>
              <select style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} value={perfFilterSA} onChange={(e) => setPerfFilterSA(e.target.value)}>
                <option value="All">All Advisors</option>
                {forensicsAdvisors.map(adv => (
                  <option key={adv.advisor_name} value={adv.advisor_name}>{adv.advisor_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--subtext)', marginBottom: '8px' }}>ALERT FILTER</label>
              <select style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} value={perfFilterAlert} onChange={(e) => setPerfFilterAlert(e.target.value)}>
                <option value="All">All Cases</option>
                <option value="Discount">Manual Discount</option>
                <option value="Rework">30-Day Rework</option>
                <option value="Leak">Labour Leakage</option>
                <option value="LowLabour">Low Labour (Model)</option>
                <option value="LowPart">Low Parts (Model)</option>
                <option value="LowLabourGlobal">Low Labour (Workshop)</option>
                <option value="LowPartGlobal">Low Parts (Workshop)</option>
                <option value="LowRevenue">Any Low Revenue</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--subtext)', marginBottom: '8px' }}>MODEL</label>
              <select style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} value={perfFilterModel} onChange={(e) => setPerfFilterModel(e.target.value)}>
                <option value="All">All Models</option>
                {forensicsModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button 
                onClick={() => { setPerfSearchReg(''); setPerfFilterLoc('All'); setPerfFilterType('All'); setPerfFilterAlert('All'); setPerfFilterSA('All'); setPerfFilterModel('All'); }}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--table-head)', border: '1px solid var(--border)', fontWeight: 700, cursor: 'pointer' }}
              >
                Reset All
              </button>
            </div>
          </div>

          {/* Forensic Invoices Registry Table */}
          <div className="card" style={{ marginTop: '0', borderTopLeftRadius: '0', borderTopRightRadius: '0' }}>
            
            {/* Subheader */}
            <div style={{ background: 'var(--navy)', color: 'white', padding: '8px 20px', fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span>REVENUE PERFORMANCE (VAS / WA / WB)</span>
              <span style={{ fontWeight: 400 }}>Live Calculation from Main Data</span>
            </div>

            <div className="table-container" style={{ maxHeight: '60vh' }}>
              <table>
                <thead>
                  <tr>
                    <th>Sr</th>
                    <th>Branch</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Bill No</th>
                    <th>Model</th>
                    <th>Reg Number</th>
                    <th>Advisor</th>
                    <th>Labour Amt</th>
                    <th>Part Amt</th>
                    <th>Discount</th>
                    <th>Discount %</th>
                    <th>Alerts</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredForensicsList.map((r, i) => {
                    const dateStr = r.invoice_date?.value || r.invoice_date || '-';
                    const scoreColor = r.advisor_score >= 85 ? 'var(--success)' : r.advisor_score >= 70 ? 'var(--accent)' : 'var(--danger)';
                    const totalVal = (r.labour_amount || 0) + (r.spare_sale || 0) + (r.discount || 0);
                    const discountPct = totalVal > 0 ? ((r.discount || 0) / totalVal * 100).toFixed(1) + '%' : '0%';
                    return (
                      <tr key={r.invoice_number}>
                        <td>{i + 1}</td>
                        <td>{r.Location || '-'}</td>
                        <td>{r.service_type || '-'}</td>
                        <td style={{ fontFamily: 'monospace' }}>{dateStr}</td>
                        <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{r.invoice_number}</td>
                        <td>{r.ppl || '-'}</td>
                        <td style={{ fontFamily: 'monospace' }}>{r.reg_no}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.advisor_name ? r.advisor_name.toLowerCase() : '-'}</td>
                        <td>{formatCurrency(r.labour_amount)}</td>
                        <td>{formatCurrency(r.spare_sale)}</td>
                        <td style={{ color: 'var(--danger)' }}>{formatCurrency(r.discount)}</td>
                        <td style={{ fontWeight: '600', color: 'var(--danger)' }}>{discountPct}</td>
                        <td>
                          <div style={{ color: '#ef4444', fontSize: '10px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px', fontWeight: '500' }}>
                            {r.alert_discount === 1 && <span>Manual Discount Applied</span>}
                            {r.alert_rework === 1 && <span>30-Day Rework (Prev: {formatDateDisplay(r.prev_date?.value || r.prev_date)} | Curr: {formatDateDisplay(r.invoice_date?.value || r.invoice_date)})</span>}
                            {r.alert_leak === 1 && <span>Labour Leakage</span>}
                            {r.alert_low_lab === 1 && <span>Labour below Model Avg</span>}
                            {r.alert_low_part === 1 && <span>Parts below Model Avg</span>}
                            {r.alert_low_lab_global === 1 && <span>Labour below Workshop Avg</span>}
                            {r.alert_low_part_global === 1 && <span>Parts below Workshop Avg</span>}
                          </div>
                        </td>
                        <td style={{ fontWeight: '800', color: scoreColor }}>{r.advisor_score}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Forensic Scoring Rules Modal */}
      {scoringRulesOpen && (
        <div className="scoring-rule-modal" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 10000, justifyContent: 'center', alignItems: 'center' }} onClick={() => setScoringRulesOpen(false)}>
          <div className="scoring-rule-content" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', color: '#1e293b', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: 'var(--navy)', fontSize: '22px', margin: 0 }}>Forensic Audit Scoring Rules</h2>
              <button onClick={() => setScoringRulesOpen(false)} style={{ background: 'none', border: 'none', fontSize: '32px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <table className="scoring-rule-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '150px', background: '#f1f5f9', color: '#475569', padding: '10px' }}>Alert Name</th>
                  <th style={{ background: '#f1f5f9', color: '#475569', padding: '10px' }}>Logic / Formula</th>
                  <th style={{ width: '120px', textAlign: 'center', background: '#f1f5f9', color: '#475569', padding: '10px' }}>Impact</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}><b style={{ color: 'var(--navy)' }}>30-Day Rework</b></td>
                  <td style={{ padding: '10px' }}>Checks if the same vehicle (Chassis_No) returned to the workshop within <b>30 days</b> of its previous visit.</td>
                  <td className="score-impact" style={{ color: '#ef4444', fontWeight: '800', textAlign: 'center', padding: '10px' }}>-25 Points</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}><b style={{ color: 'var(--navy)' }}>Manual Discount</b></td>
                  <td style={{ padding: '10px' }}>Flagged if any manual discount (Job_Discount) greater than <b>20%</b> is applied to the bill.</td>
                  <td className="score-impact" style={{ color: '#ef4444', fontWeight: '800', textAlign: 'center', padding: '10px' }}>-10 Points</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}><b style={{ color: 'var(--navy)' }}>Labour Leakage</b></td>
                  <td style={{ padding: '10px' }}>Flagged if <b>Parts Sale &gt; ₹1,000</b> but <b>Labour Amount = ₹0</b>. Identifies potential leakage.</td>
                  <td className="score-impact" style={{ color: '#ef4444', fontWeight: '800', textAlign: 'center', padding: '10px' }}>-20 Points</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}><b style={{ color: 'var(--navy)' }}>Low Labour (Model)</b></td>
                  <td style={{ padding: '10px' }}>Compares labour against <b>monthly average</b> for that Model and Service Type. Flagged if <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 4px', borderRadius: '4px' }}>&lt; 50%</span>.</td>
                  <td className="score-impact" style={{ color: '#ef4444', fontWeight: '800', textAlign: 'center', padding: '10px' }}>-10 Points</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}><b style={{ color: 'var(--navy)' }}>Low Parts (Model)</b></td>
                  <td style={{ padding: '10px' }}>Compares parts against <b>monthly average</b> for that Model and Service Type. Flagged if <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 4px', borderRadius: '4px' }}>&lt; 50%</span>.</td>
                  <td className="score-impact" style={{ color: '#ef4444', fontWeight: '800', textAlign: 'center', padding: '10px' }}>-10 Points</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}><b style={{ color: 'var(--navy)' }}>Low Labour (Workshop)</b></td>
                  <td style={{ padding: '10px' }}>Compares labour against the <b>entire workshop's monthly average</b> for that Service Type. Flagged if <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 4px', borderRadius: '4px' }}>&lt; 50%</span>.</td>
                  <td className="score-impact" style={{ color: '#ef4444', fontWeight: '800', textAlign: 'center', padding: '10px' }}>-5 Points</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}><b style={{ color: 'var(--navy)' }}>Low Parts (Workshop)</b></td>
                  <td style={{ padding: '10px' }}>Compares parts against the <b>entire workshop's monthly average</b> for that Service Type. Flagged if <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 4px', borderRadius: '4px' }}>&lt; 50%</span>.</td>
                  <td className="score-impact" style={{ color: '#ef4444', fontWeight: '800', textAlign: 'center', padding: '10px' }}>-5 Points</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Vehicle Information Details Modal */}
      {selectedVehicleDetails && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 10000, justifyContent: 'center', alignItems: 'center' }} onClick={() => setSelectedVehicleDetails(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#f8fafc', borderRadius: '12px', width: '90%', maxWidth: '850px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            <div style={{ background: 'var(--navy)', color: 'white', padding: '20px 30px', position: 'relative' }}>
              <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>📋</span> Vehicle Information Details
              </h2>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>Full data extraction for selected Job Card</div>
              <button onClick={() => setSelectedVehicleDetails(null)} style={{ position: 'absolute', top: '20px', right: '30px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>&times;</button>
            </div>

            <div style={{ padding: '30px', overflowY: 'auto', maxHeight: '70vh' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>STATUS</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>Open</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>JOB CARD DELAY REASON</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.delay_reason || '-'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>CHASSIS NO</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.chassis_no || '-'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>ACTION ON DELAY REASON</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)', lineHeight: 1.4 }}>
                    Receiving Date : {selectedVehicleDetails.created_date?.value || selectedVehicleDetails.created_date || '-'} PTD : - Claim date : -
                    {selectedVehicleDetails.action_taken ? ' Action: ' + selectedVehicleDetails.action_taken : ''}
                  </div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>PPL</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.model || '-'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}># OF JOB CARDS</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>1</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>JC OPEN DAYS BUCKET</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>
                    {parseInt(selectedVehicleDetails.open_days) > 15 ? 'D: > 15 Days' : parseInt(selectedVehicleDetails.open_days) >= 8 ? 'D: 8-15 Days' : parseInt(selectedVehicleDetails.open_days) >= 5 ? 'D: 5-7 Days' : 'D: 0-4 Days'}
                  </div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>SERVICE TYPE</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.service_type || '-'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>REGION</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.region || selectedVehicleDetails.Region || 'North1'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>JC</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.jc_number || '-'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>JOB CARD CREATED DATE</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.created_date?.value || selectedVehicleDetails.created_date || '-'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>DIVISION</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.division || selectedVehicleDetails.Division || '7009420 SaFa Passenger Car'}</div>
                </div>
              </div>
            </div>

            <div style={{ background: 'white', padding: '20px 30px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedVehicleDetails(null)} style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>Close Window</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
