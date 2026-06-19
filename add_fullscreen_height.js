const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.js');
let content = fs.readFileSync(pagePath, 'utf8');

const targetStr = `.fullscreen .child-row td { font-size: 14px !important; padding: 14px 16px !important; }`;
const replacementStr = `.fullscreen .child-row td { font-size: 14px !important; padding: 14px 16px !important; }
        .fullscreen .table-container { max-height: calc(100vh - 150px) !important; overflow-y: auto !important; }`;

content = content.replace(targetStr, replacementStr);

if (content.includes('max-height: calc(100vh - 150px)')) {
  fs.writeFileSync(pagePath, content, 'utf8');
  console.log('Successfully added max-height to .fullscreen .table-container');
} else {
  console.log('Failed to match string!');
}
