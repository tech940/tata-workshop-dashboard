const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.js');
let content = fs.readFileSync(pagePath, 'utf8');

const newTable = `
          {/* Location Summary Table */}
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
          </div>
        </div>
      )}
`;

const splitStr = `        </div>
        )}

        {/* -------------------- SECTION 3: WORKSHOP OPERATIONS (OPS BACKLOGS) -------------------- */}`;

// Let's use a safer replacement strategy
const targetIndex = content.indexOf(`{/* -------------------- SECTION 3: WORKSHOP OPERATIONS`);
if (targetIndex !== -1) {
    // Find the closing brace of the vas block
    const preContent = content.substring(0, targetIndex);
    const lastClosingDiv = preContent.lastIndexOf(`</div>\n        )}`);
    
    if (lastClosingDiv !== -1) {
        content = content.substring(0, lastClosingDiv) + newTable + content.substring(lastClosingDiv + 16);
        fs.writeFileSync(pagePath, content, 'utf8');
        console.log("Successfully injected the table!");
    } else {
        console.log("Failed to find closing div");
    }
} else {
    console.log("Failed to find section 3");
}
