
const fs = require('fs');
const content = fs.readFileSync('e:\\SAMIndex\\frontend\\src\\pages\\CodeSearchPage.jsx', 'utf8');

let depth = 0;
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') depth++;
    if (line[j] === '}') depth--;
    if (depth < 0) {
      console.log(`Imbalance at line ${i + 1}, col ${j + 1}: depth is ${depth}`);
      process.exit(1);
    }
  }
}
console.log(`Final depth: ${depth}`);
