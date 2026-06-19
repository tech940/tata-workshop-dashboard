const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.js');
let content = fs.readFileSync(pagePath, 'utf8');

const tableStr = `          {/* Location Summary Table */}
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
          </div>\n\n`;

// 1. Remove it from its current location
content = content.replace(tableStr, '');

// 2. Inject it at the end of section-vas
const targetEndVas = `            </div>
          )}
        </div>
      )}`;

const newEndVas = `            </div>
          )}
${tableStr}
        </div>
      )}`;

content = content.replace(targetEndVas, newEndVas);

fs.writeFileSync(pagePath, content, 'utf8');
console.log('Successfully moved Location Summary Table to section-vas');
