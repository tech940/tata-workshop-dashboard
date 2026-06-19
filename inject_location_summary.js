const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.js');
let content = fs.readFileSync(pagePath, 'utf8');

const targetStr = `          {/* Workshop Performance Section (Day Wise Trend Chart) */}`;

const injectionStr = `          {/* Location Summary Table */}
          <div className="card" style={{ marginBottom: '15px' }}>
            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', background: 'white', color: 'var(--navy)', fontWeight: 'bold' }}>TOTAL LOAD</th>
                    <th style={{ background: 'white', color: 'var(--navy)', fontWeight: 'normal' }}>EW</th>
                    <th style={{ background: 'white', color: 'var(--navy)', fontWeight: 'normal' }}>EW %</th>
                    <th style={{ background: 'white', color: 'var(--navy)', fontWeight: 'normal' }}>RSA</th>
                    <th style={{ background: 'white', color: 'var(--navy)', fontWeight: 'normal' }}>RSA %</th>
                    <th style={{ background: 'white', color: 'var(--navy)', fontWeight: 'normal' }}>AMC</th>
                    <th style={{ background: 'white', color: 'var(--navy)', fontWeight: 'normal' }}>AMC%</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedData && aggregatedData.locs ? aggregatedData.locs.map(loc => (
                    <tr key={loc.Location} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ textAlign: 'left', fontWeight: 'normal', color: 'black' }}>{loc.Location}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  )) : ['JAMMU', 'KATHUA', 'SAMBA', 'POONCH'].map(loc => (
                    <tr key={loc} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ textAlign: 'left', fontWeight: 'normal', color: 'black' }}>{loc}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Workshop Performance Section (Day Wise Trend Chart) */}`;

content = content.replace(targetStr, injectionStr);

if (content.includes('Location Summary Table')) {
  fs.writeFileSync(pagePath, content, 'utf8');
  console.log('Successfully injected Location Summary Table');
} else {
  console.log('Failed to match target string');
}
