const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.js');
let content = fs.readFileSync(pagePath, 'utf8');

const targetStr = `.fullscreen { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; z-index: 9999 !important; overflow-y: auto !important; background: var(--bg) !important; margin: 0 !important; padding: 20px !important; box-sizing: border-box !important; border-radius: 0 !important; max-height: none !important; width: 100vw !important; height: 100vh !important; }`;

const replacementStr = `.fullscreen { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; z-index: 9999 !important; overflow-y: auto !important; background: var(--bg) !important; margin: 0 !important; padding: 20px !important; box-sizing: border-box !important; border-radius: 0 !important; max-height: none !important; width: 100vw !important; height: 100vh !important; }
        .fullscreen .table-container th { font-size: 15px !important; padding: 18px !important; }
        .fullscreen .table-container td { font-size: 15px !important; padding: 16px 18px !important; }
        .fullscreen .table-container td span { font-size: 15px !important; }
        .fullscreen .group-row td { font-size: 16px !important; padding: 18px !important; }
        .fullscreen .child-row td { font-size: 14px !important; padding: 14px 16px !important; }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(pagePath, content, 'utf8');
console.log('Successfully injected fullscreen CSS');
