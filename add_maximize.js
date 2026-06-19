const fs = require('fs');
const path = require('path');

const pageJsPath = path.join(__dirname, 'app', 'page.js');
let content = fs.readFileSync(pageJsPath, 'utf8');

const targetHeader = `        <div id="section-vas">
          <div style={{ background: 'var(--navy)', color: 'var(--navy-text)', padding: '10px 20px', borderRadius: '8px', marginBottom: '15px', fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>WORKSHOP REVENUE ANALYSIS</span>`;

const replacementHeader = `        <div id="section-vas" className={vasMaximized ? 'fullscreen' : ''}>
          <div style={{ background: 'var(--navy)', color: 'var(--navy-text)', padding: '10px 20px', borderRadius: '8px', marginBottom: '15px', fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button 
                onClick={() => setVasMaximized(!vasMaximized)} 
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                {vasMaximized ? 'Minimize' : 'Maximize'}
              </button>
              <span>WORKSHOP REVENUE ANALYSIS</span>
            </span>`;

if (content.includes('<span>WORKSHOP REVENUE ANALYSIS</span>')) {
    content = content.replace(targetHeader, replacementHeader);
    
    // As a fallback in case exact spacing is off:
    if (!content.includes('setVasMaximized(!vasMaximized)')) {
        content = content.replace(
            "<span>WORKSHOP REVENUE ANALYSIS</span>",
            `<span style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><button onClick={() => setVasMaximized(!vasMaximized)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>{vasMaximized ? 'Minimize' : 'Maximize'}</button><span>WORKSHOP REVENUE ANALYSIS</span></span>`
        );
        content = content.replace('<div id="section-vas">', '<div id="section-vas" className={vasMaximized ? \'fullscreen\' : \'\'}>');
    }
}

fs.writeFileSync(pageJsPath, content, 'utf8');
console.log("Maximize button injected!");
