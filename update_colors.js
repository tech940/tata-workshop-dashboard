const fs = require('fs');
const path = require('path');

const pageJsPath = path.join(__dirname, 'app', 'page.js');
let content = fs.readFileSync(pageJsPath, 'utf8');

// Helper functions injected into page.js
const helpers = `
  const getPctColor = (pctStr) => {
    const val = parseFloat(pctStr);
    return isNaN(val) ? 'inherit' : (val >= 20 ? 'var(--success)' : 'var(--danger)');
  };
`;

if (!content.includes('getPctColor')) {
    content = content.replace('const handleDownloadCSV = () => {', helpers + '\n  const handleDownloadCSV = () => {');
}

// 1. Rename Header
content = content.replace(
    /<span>Detailed VAS & Workshop Performance<\/span>/g,
    `<span>WORKSHOP REVENUE ANALYSIS</span>`
);

// 2. Add subheader row
const subheaderHtml = `
            {/* Subheader */}
            <div style={{ background: 'var(--navy)', color: 'white', padding: '8px 20px', fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span>REVENUE PERFORMANCE (VAS / WA / WB)</span>
              <span style={{ fontWeight: 400 }}>Live Calculation from Main Data</span>
            </div>
`;
content = content.replace(
    /<div className="card">(\s*)<div className="table-container"/g,
    `<div className="card" style={{ marginTop: '0', borderTopLeftRadius: '0', borderTopRightRadius: '0' }}>$1${subheaderHtml}$1<div className="table-container"`
);

// Update table colors.
// Instead of replacing <td> tags globally, we replace the specific ones.
// LESS VAS. (vas_cy)
content = content.replace(/<td>\{formatCurrency\(([^)]+?\.vas_cy)\)\}<\/td>/g, '<td style={{ color: \'#3b82f6\', fontWeight: \'600\' }}>{formatCurrency($1)}</td>');

// LAB(-VAS) (lab_cy - vas_cy)
content = content.replace(/<td>\{formatCurrency\(([^)]+?\.lab_cy\s*-\s*[^)]+?\.vas_cy)\)\}<\/td>/g, '<td style={{ color: \'#3b82f6\', fontWeight: \'600\' }}>{formatCurrency($1)}</td>');

// WA AMT (wa_cy)
content = content.replace(/<td>\{formatCurrency\(([^)]+?\.wa_cy)\)\}<\/td>/g, '<td style={{ color: \'#3b82f6\', fontWeight: \'600\' }}>{formatCurrency($1)}</td>');

// WB AMT (wb_cy)
content = content.replace(/<td>\{formatCurrency\(([^)]+?\.wb_cy)\)\}<\/td>/g, '<td style={{ color: \'#3b82f6\', fontWeight: \'600\' }}>{formatCurrency($1)}</td>');

// VAS %
content = content.replace(/<td>\{([^}]+?\.lab_cy\s*>\s*0\s*\?\s*\(\([^)]+?\.vas_cy\s*\/\s*[^)]+?\.lab_cy\)\s*\*\s*100\)\.toFixed\(0\)\s*:\s*0)\}%\<\/td>/g, (match, p1) => {
    return `<td style={{ color: getPctColor(${p1}), fontWeight: '600' }}>{${p1}}%</td>`;
});

// WA/RO %
content = content.replace(/<td>\{([^}]+?\.cy\s*>\s*0\s*\?\s*\(\([^)]+?\.wa_count_cy\s*\/\s*[^)]+?\.cy\)\s*\*\s*100\)\.toFixed\(0\)\s*:\s*0)\}%\<\/td>/g, (match, p1) => {
    return `<td style={{ color: getPctColor(${p1}), fontWeight: '600' }}>{${p1}}%</td>`;
});

// WB/RO %
content = content.replace(/<td>\{([^}]+?\.cy\s*>\s*0\s*\?\s*\(\([^)]+?\.wb_count_cy\s*\/\s*[^)]+?\.cy\)\s*\*\s*100\)\.toFixed\(0\)\s*:\s*0)\}%\<\/td>/g, (match, p1) => {
    return `<td style={{ color: getPctColor(${p1}), fontWeight: '600' }}>{${p1}}%</td>`;
});

fs.writeFileSync(pageJsPath, content, 'utf8');
console.log("Colors and headers updated successfully!");
