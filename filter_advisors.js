const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.js');
let content = fs.readFileSync(pagePath, 'utf8');

const targetStr = `      if (vasViewMode === 'advisor') {
        aggregatedData.vasService.forEach(s => {
          grouped[s.Location] = { 
            items: Object.values(s.breakdown || {}), 
            totals: s, 
            advisors: new Set([s.Location]), 
            monthlyAdvisors: new Set([s.Location]) 
          };
        });
        return { grouped, sortedKeys: Object.keys(grouped).sort((a, b) => grouped[b].totals.cy - grouped[a].totals.cy) };
      } else {`;

const newStr = `      if (vasViewMode === 'advisor') {
        aggregatedData.vasService.forEach(s => {
          grouped[s.Location] = { 
            items: Object.values(s.breakdown || {}), 
            totals: s, 
            advisors: new Set([s.Location]), 
            monthlyAdvisors: new Set([s.Location]) 
          };
        });
        return { 
          grouped, 
          sortedKeys: Object.keys(grouped)
            .filter(k => grouped[k].totals.cy > 0)
            .sort((a, b) => grouped[b].totals.cy - grouped[a].totals.cy) 
        };
      } else {`;

content = content.replace(targetStr, newStr);

// To ensure it matched, check if the string changed
if(content.includes('filter(k => grouped[k].totals.cy > 0)')) {
  fs.writeFileSync(pagePath, content, 'utf8');
  console.log('Successfully filtered zero-JC advisors');
} else {
  console.log('Failed to match string!');
}
