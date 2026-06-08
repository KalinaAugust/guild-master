const fs = require('fs');
const path = require('path');

const reportDir = '/Users/deniskalinin/.gemini/antigravity-cli/brain/0e11df31-62e4-40dc-95c6-1bd57194b96f';
const occurrences = JSON.parse(fs.readFileSync(path.join(reportDir, 'occurrences.json'), 'utf8'));

console.log('=== DETAILED ANALYSIS ===\n');

// 1. Font-size in px
const fontSizePx = occurrences.filter(o => o.property === 'font-size' && o.unit === 'px');
console.log(`--- font-size in px (${fontSizePx.length} occurrences) ---`);
fontSizePx.forEach(o => {
  console.log(`  ${o.file}:${o.line} -> ${o.property}: ${o.value}`);
});

// 2. Padding in rem
const paddingRem = occurrences.filter(o => o.property === 'padding' && o.unit === 'rem');
console.log(`\n--- padding in rem (${paddingRem.length} occurrences) ---`);
paddingRem.forEach(o => {
  console.log(`  ${o.file}:${o.line} -> ${o.property}: ${o.value}`);
});

// 3. Gap in rem
const gapRem = occurrences.filter(o => o.property === 'gap' && o.unit === 'rem');
console.log(`\n--- gap in rem (${gapRem.length} occurrences) ---`);
gapRem.forEach(o => {
  console.log(`  ${o.file}:${o.line} -> ${o.property}: ${o.value}`);
});

// 4. Border-radius in rem
const borderRadiusRem = occurrences.filter(o => o.property === 'border-radius' && o.unit === 'rem');
console.log(`\n--- border-radius in rem (${borderRadiusRem.length} occurrences) ---`);
borderRadiusRem.forEach(o => {
  console.log(`  ${o.file}:${o.line} -> ${o.property}: ${o.value}`);
});

// 5. Margins in rem
const marginRem = occurrences.filter(o => o.property.startsWith('margin') && o.unit === 'rem');
console.log(`\n--- margin in rem (${marginRem.length} occurrences) ---`);
marginRem.forEach(o => {
  console.log(`  ${o.file}:${o.line} -> ${o.property}: ${o.value}`);
});

// 6. Other unexpected REM usages (height, width, top, right, padding-left)
const othersRem = occurrences.filter(o => 
  ['height', 'width', 'top', 'right', 'padding-left'].includes(o.property) && o.unit === 'rem'
);
console.log(`\n--- other rem usages (${othersRem.length} occurrences) ---`);
othersRem.forEach(o => {
  console.log(`  ${o.file}:${o.line} -> ${o.property}: ${o.value}`);
});
