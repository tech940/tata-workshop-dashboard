const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.js');
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Regex to remove the current Location Summary Table
const removeRegex = /[ \t]*\{\/\* Location Summary Table \*\/\}[\s\S]*?<\/div>\s*<\/div>/;
content = content.replace(removeRegex, '');

// 2. The new table with columns: LOCATION, TOTAL LOAD, EW, EW %, RSA, RSA %, AMC, AMC%
const newTable = `          {/* Location Summary Table */}
          <div className="card" style={{ marginBottom: '15px', borderTopLeftRadius: '0', borderTopRightRadius: '0' }}>
            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', background: 'white', color: 'var(--navy)', fontWeight: 'bold' }}>LOCATION</th>
                    <th style={{ background: 'white', color: 'var(--navy)', fontWeight: 'bold' }}>TOTAL LOAD</th>
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
                      <td style={{ textAlign: 'left', fontWeight: 'bold', color: 'black' }}>{loc.Location}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  )) : ['JAMMU', 'KATHUA', 'SAMBA', 'POONCH'].map(loc => (
                    <tr key={loc} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ textAlign: 'left', fontWeight: 'bold', color: 'black' }}>{loc}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))}
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ textAlign: 'left', fontWeight: 'bold', color: 'black' }}>GTOTAL</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>`;

// 3. Inject before the end of section-vas
const targetInjection = `          </div>
        )}

        {/* -------------------- SECTION 3: WORKSHOP OPERATIONS (OPS BACKLOGS) -------------------- */}`;

const injectionWithTable = `${newTable}
          </div>
        )}

        {/* -------------------- SECTION 3: WORKSHOP OPERATIONS (OPS BACKLOGS) -------------------- */}`;

content = content.replace(targetInjection, injectionWithTable);

fs.writeFileSync(pagePath, content, 'utf8');
console.log('Successfully moved and updated Location Summary Table to section-vas');
