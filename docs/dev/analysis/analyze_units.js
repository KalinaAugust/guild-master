const fs = require('fs');
const path = require('path');

const projectDir = '/Users/deniskalinin/.gemini/antigravity-cli/brain/d554e810-5c0a-4c0d-85ac-01e58e4257ab/.system_generated/worktrees/subagent-Isolated-Developer-self-79be1b61';
const srcDir = path.join(projectDir, 'src');

// Helper to recursively find CSS files
function findCssFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findCssFiles(filePath, fileList);
    } else if (file.endsWith('.css') || file.endsWith('.scss')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const cssFiles = findCssFiles(srcDir);
console.log(`Found ${cssFiles.length} CSS/SCSS files.`);

const occurrences = [];

// Regular expression to parse property-value pairs
// We want to handle comments first, and media queries.
// A simple way is to match property: value, then scan the value for px/rem.
for (const file of cssFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  // Basic comment stripper for block comments
  let inBlockComment = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const lineNum = i + 1;
    
    // Strip comments in this line (simplified)
    // Note: this is a simple analyzer, it doesn't need to be a full CSS spec parser, but should be reasonably accurate.
    let cleanLine = '';
    let j = 0;
    while (j < line.length) {
      if (!inBlockComment && line[j] === '/' && line[j+1] === '*') {
        inBlockComment = true;
        j += 2;
      } else if (inBlockComment && line[j] === '*' && line[j+1] === '/') {
        inBlockComment = false;
        j += 2;
      } else {
        if (!inBlockComment) {
          cleanLine += line[j];
        }
        j++;
      }
    }
    
    // Check if line contains properties
    // Looking for property: value
    const colonIndex = cleanLine.indexOf(':');
    if (colonIndex !== -1) {
      const propertyPart = cleanLine.substring(0, colonIndex).trim();
      const valuePart = cleanLine.substring(colonIndex + 1).trim();
      
      // Property validation (should look like a CSS property name, no special selectors)
      // Usually starts with alphanumeric, dash, or double-dash (for custom properties)
      if (/^[a-zA-Z-*_]+$/.test(propertyPart)) {
        // Find all px/rem in valuePart
        const unitRegex = /(-?\d+(?:\.\d+)?)(px|rem)\b/g;
        let match;
        while ((match = unitRegex.exec(valuePart)) !== null) {
          const fullMatch = match[0];
          const valNum = parseFloat(match[1]);
          const unit = match[2];
          
          occurrences.push({
            file: path.relative(projectDir, file),
            line: lineNum,
            property: propertyPart,
            value: valuePart.replace(/;$/, ''),
            exact: fullMatch,
            num: valNum,
            unit: unit
          });
        }
      }
    }
  }
}

// Write detailed occurrences to a JSON file
const reportDir = '/Users/deniskalinin/.gemini/antigravity-cli/brain/0e11df31-62e4-40dc-95c6-1bd57194b96f';
fs.writeFileSync(path.join(reportDir, 'occurrences.json'), JSON.stringify(occurrences, null, 2));
console.log(`Saved ${occurrences.length} occurrences to occurrences.json`);

// Calculate statistics
const stats = {
  total: occurrences.length,
  pxCount: occurrences.filter(o => o.unit === 'px').length,
  remCount: occurrences.filter(o => o.unit === 'rem').length,
  properties: {},
  byFile: {},
  discrepancies: [] // instances that might violate consistency
};

for (const o of occurrences) {
  // Stats by property
  if (!stats.properties[o.property]) {
    stats.properties[o.property] = { px: 0, rem: 0, total: 0 };
  }
  stats.properties[o.property][o.unit]++;
  stats.properties[o.property].total++;

  // Stats by file
  if (!stats.byFile[o.file]) {
    stats.byFile[o.file] = { px: 0, rem: 0, total: 0 };
  }
  stats.byFile[o.file][o.unit]++;
  stats.byFile[o.file].total++;
}

// Print high-level stats
console.log('\n--- High-level Statistics ---');
console.log(`Total occurrences: ${stats.total}`);
console.log(`PX usage: ${stats.pxCount} (${((stats.pxCount / stats.total) * 100).toFixed(1)}%)`);
console.log(`REM usage: ${stats.remCount} (${((stats.remCount / stats.total) * 100).toFixed(1)}%)`);

console.log('\n--- Stats by Property ---');
const sortedProps = Object.entries(stats.properties).sort((a, b) => b[1].total - a[1].total);
for (const [prop, data] of sortedProps) {
  console.log(`${prop.padEnd(25)}: total ${String(data.total).padEnd(4)} | px: ${String(data.px).padEnd(3)} | rem: ${String(data.rem).padEnd(3)}`);
}

// Find inconsistencies
console.log('\n--- Inconsistencies ---');
// Let's identify properties where both units are used
console.log('Properties using BOTH px and rem:');
for (const [prop, data] of sortedProps) {
  if (data.px > 0 && data.rem > 0) {
    console.log(`  - ${prop}: px ${data.px}, rem ${data.rem}`);
  }
}

// Save summary to JSON
fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify(stats, null, 2));
console.log('\nSaved summary.json');
