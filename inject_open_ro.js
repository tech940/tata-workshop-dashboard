const fs = require('fs');
const path = require('path');

const pageJsPath = path.join(__dirname, 'app', 'page.js');
let content = fs.readFileSync(pageJsPath, 'utf8');

// 1. Add state for vasOpenRoExpandedGroups
if (!content.includes('vasOpenRoExpandedGroups')) {
    content = content.replace(
        "const [vasOpenRoMode, setVasOpenRoMode] = useState(false);",
        "const [vasOpenRoMode, setVasOpenRoMode] = useState(false);\n  const [vasOpenRoExpandedGroups, setVasOpenRoExpandedGroups] = useState({ 'Accident': true, 'Running Repairs': false, 'Paid Service': false, 'Free Services': false, 'Others': false });"
    );
}

// 2. Add `aggregatedOpenRo` hook
const aggregatedOpenRoHook = `
  const aggregatedOpenRo = useMemo(() => {
    if (!opsOpenRos || opsOpenRos.length === 0) return { byType: {}, byReason: {}, totalRow: null, reasonTotalRow: null };

    const byType = {};
    const byReason = {};

    let gTotal = { count: 0, d0_4: 0, d5_7: 0, d8_15: 0, d15_plus: 0, totalDays: 0 };
    let rTotal = { mech: 0, acc: 0, d0_4: 0, d5_7: 0, d8_15: 0, d15_plus: 0, totalDays: 0 };

    opsOpenRos.forEach(ro => {
      // Clean and normalize
      let type = ro.service_type || 'Others';
      if (type.toLowerCase().includes('accident') || type === 'ACC') type = 'Accident';
      else if (type.toLowerCase().includes('free')) type = 'Free Services';
      else if (type.toLowerCase().includes('paid')) type = 'Paid Service';
      else if (type.toLowerCase().includes('running')) type = 'Running Repairs';
      else type = 'Others';

      let reason = ro.delay_reason || 'No Reason Specified';
      if (reason.trim() === '') reason = 'No Reason Specified';

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
  }, [opsOpenRos]);
`;

if (!content.includes('aggregatedOpenRo')) {
    content = content.replace("const isMTD =", aggregatedOpenRoHook + "\n  const isMTD =");
}

// 3. Add the toggle button
const toggleButtonJsx = `
                <button 
                  onClick={() => setVasOpenRoMode(!vasOpenRoMode)} 
                  className="tab active" 
                  style={{ background: vasOpenRoMode ? 'var(--danger)' : '#2563eb', border: 'none', color: 'white', fontWeight: 'bold' }}
                >
                  {vasOpenRoMode ? '" EXIT OPEN RO' : '" OPEN RO'}
                </button>
`;
if (!content.includes('setVasOpenRoMode(!vasOpenRoMode)')) {
    content = content.replace(
        "Mode: {vasTypeMode}\n                </button>",
        "Mode: {vasTypeMode}\n                </button>\n" + toggleButtonJsx
    );
}

// 4. Inject the Open RO tables
const openRoTablesJsx = `
        {vasOpenRoMode ? (
            <div style={{ marginTop: '0' }}>
              <div className="card" style={{ marginTop: '0', borderTopLeftRadius: '0', borderTopRightRadius: '0' }}>
                <div style={{ background: 'var(--navy)', color: 'white', padding: '8px 20px', fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span>REVENUE PERFORMANCE (VAS / WA / WB)</span>
                  <span style={{ fontWeight: 400 }}>Live Calculation from Main Data</span>
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
                                <span className={\`group-icon \${expanded ? 'expanded' : ''}\`} style={{ display: 'inline-block', width: '12px', transition: 'transform 0.2s', fontSize: '8px', marginRight: '5px', transform: expanded ? 'rotate(90deg)' : 'none' }}>▶</span>
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
                               const textStr = \`\${it.delay_reason} Receiving Date : \${it.created_date?.value || it.created_date || '-'} PTD : - Claim date : - \${it.action_taken ? 'Action: '+it.action_taken : ''}\`;
                               return (
                                  <tr key={it.jc_number} className="child-row">
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
`;

if (!content.includes('JOB CARD DELAY REASON SUMMARY')) {
    content = content.replace(
        '<div className="card" style={{ marginTop: \'0\', borderTopLeftRadius: \'0\', borderTopRightRadius: \'0\' }}>',
        openRoTablesJsx + '\n          <div className="card" style={{ marginTop: \'0\', borderTopLeftRadius: \'0\', borderTopRightRadius: \'0\' }}>'
    );
    // Add the closing brace for the ternary operator at the end of the section
    content = content.replace(
        '{/* -------------------- SECTION 3: WORKSHOP OPERATIONS -------------------- */}',
        '        )}\n\n        {/* -------------------- SECTION 3: WORKSHOP OPERATIONS -------------------- */}'
    );
}

fs.writeFileSync(pageJsPath, content, 'utf8');
console.log("Open RO successfully injected!");
