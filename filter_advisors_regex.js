const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.js');
let content = fs.readFileSync(pagePath, 'utf8');

const regex = /return\s*\{\s*grouped,\s*sortedKeys:\s*Object\.keys\(grouped\)\.sort\(\(a,\s*b\)\s*=>\s*grouped\[b\]\.totals\.cy\s*-\s*grouped\[a\]\.totals\.cy\)\s*\};\s*\}\s*else\s*\{/;

const newStr = `return { 
          grouped, 
          sortedKeys: Object.keys(grouped)
            .filter(k => grouped[k].totals.cy > 0)
            .sort((a, b) => grouped[b].totals.cy - grouped[a].totals.cy) 
        };
      } else {`;

content = content.replace(regex, newStr);

if(content.includes('filter(k => grouped[k].totals.cy > 0)')) {
  fs.writeFileSync(pagePath, content, 'utf8');
  console.log('Successfully filtered zero-JC advisors');
} else {
  console.log('Failed to match string!');
}
