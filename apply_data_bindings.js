const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.js');
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Inject state
content = content.replace(
  `  const [opsEw, setOpsEw] = useState([]);`,
  `  const [opsEw, setOpsEw] = useState([]);\n  const [opsAmcSummary, setOpsAmcSummary] = useState([]);\n  const [opsEwSummary, setOpsEwSummary] = useState([]);`
);

// 2. Inject setters
content = content.replace(
  `      setOpsEw(progData.ew?.recent || []);`,
  `      setOpsEw(progData.ew?.recent || []);\n      setOpsAmcSummary(progData.amc?.summary || []);\n      setOpsEwSummary(progData.ew?.summaryByLocation || []);`
);

// 3. Replace the table
const oldTableStart = `{/* Location Summary Table */}`;
const oldTableEnd = `</div>\n          </div>`; // The two closing divs of the card

const startIdx = content.indexOf(oldTableStart);
if (startIdx !== -1) {
    // Find the end of the card
    const endIdx = content.indexOf(`</div>\n          </div>`, startIdx);
    if (endIdx !== -1) {
        const replaceLen = (endIdx + `</div>\n          </div>`.length) - startIdx;
        const targetStr = content.substring(startIdx, startIdx + replaceLen);
        
        const newTableStr = `{/* Location Summary Table */}
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
                    const ewObj = opsEwSummary.find(e => e.division === loc.Location) || { total_contracts: 0 };
                    const amcObj = opsAmcSummary.find(a => a.division === loc.Location) || { total_contracts: 0 };
                    const ewCount = ewObj.total_contracts;
                    const amcCount = amcObj.total_contracts;
                    const ewPct = totalLoad > 0 ? ((ewCount / totalLoad) * 100).toFixed(0) : 0;
                    const amcPct = totalLoad > 0 ? ((amcCount / totalLoad) * 100).toFixed(0) : 0;
                    return (
                    <tr key={loc.Location} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ textAlign: 'left', fontWeight: 'bold', color: 'black' }}>{loc.Location}</td>
                      <td>{formatNumber(totalLoad)}</td>
                      <td>{formatNumber(ewCount)}</td>
                      <td style={{ color: getPctColor(ewPct), fontWeight: 'bold' }}>{ewPct}%</td>
                      <td>0</td>
                      <td style={{ color: getPctColor(0), fontWeight: 'bold' }}>0%</td>
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
                    const ewPct = totalLoad > 0 ? ((ewCount / totalLoad) * 100).toFixed(0) : 0;
                    const amcPct = totalLoad > 0 ? ((amcCount / totalLoad) * 100).toFixed(0) : 0;
                    return (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ textAlign: 'left', fontWeight: 'bold', color: 'black' }}>GTOTAL</td>
                      <td style={{ fontWeight: 'bold' }}>{formatNumber(totalLoad)}</td>
                      <td style={{ fontWeight: 'bold' }}>{formatNumber(ewCount)}</td>
                      <td style={{ color: getPctColor(ewPct), fontWeight: 'bold' }}>{ewPct}%</td>
                      <td style={{ fontWeight: 'bold' }}>0</td>
                      <td style={{ color: getPctColor(0), fontWeight: 'bold' }}>0%</td>
                      <td style={{ fontWeight: 'bold' }}>{formatNumber(amcCount)}</td>
                      <td style={{ color: getPctColor(amcPct), fontWeight: 'bold' }}>{amcPct}%</td>
                    </tr>
                    );
                  })() : null}
                </tbody>
              </table>
            </div>
          </div>`;
        
        content = content.replace(targetStr, newTableStr);
        fs.writeFileSync(pagePath, content, 'utf8');
        console.log("Updated data bindings successfully!");
    } else {
        console.log("Could not find end of table.");
    }
} else {
    console.log("Could not find start of table.");
}
