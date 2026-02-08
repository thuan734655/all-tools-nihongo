import XLSX from 'xlsx';
import fs from 'fs';

// Load the Excel file
const workbook = XLSX.readFile('Tổng hợp ngữ pháp N3 hay có trong đề.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON with raw values
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('=== EXCEL FILE STRUCTURE ===');
console.log('Total rows:', data.length);

// Find all columns used
let maxCols = 0;
data.forEach(row => {
  if (row && row.length > maxCols) maxCols = row.length;
});
console.log('Max columns:', maxCols);

// Show first 20 rows to understand structure
console.log('\n=== FIRST 20 ROWS ===');
for (let i = 0; i < 20 && i < data.length; i++) {
  console.log(`Row ${i}:`, data[i]);
}

// Parse grammar entries based on structure:
// - Numbers (1, 2, 3...) are grammar pattern IDs
// - Text after pattern ID is the pattern name
// - Following rows contain examples
const grammarEntries = [];
let currentGrammarNumber = 0;
let currentEntry = null;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0) continue;
  
  // Check if first cell is a number (new grammar pattern)
  const firstCell = row[0];
  
  if (typeof firstCell === 'number' && firstCell > 0 && firstCell <= 100) {
    // This is a new grammar pattern number
    if (currentEntry && currentEntry.pattern) {
      grammarEntries.push(currentEntry);
    }
    
    currentGrammarNumber = firstCell;
    currentEntry = {
      id: `n3_grammar_${String(currentGrammarNumber).padStart(3, '0')}`,
      order: currentGrammarNumber,
      level: 'N3',
      pattern: '',
      meaning: '',
      examples: [],
      notes: ''
    };
    
    // Check if pattern name is in another column
    for (let j = 1; j < row.length; j++) {
      if (row[j] && typeof row[j] === 'string' && row[j].trim()) {
        if (!currentEntry.pattern) {
          currentEntry.pattern = row[j].trim();
        } else if (!currentEntry.meaning) {
          currentEntry.meaning = row[j].trim();
        }
      }
    }
  } else if (currentEntry) {
    // This is content for current grammar pattern
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell && typeof cell === 'string' && cell.trim()) {
        const cellText = cell.trim();
        
        // Check if this looks like a pattern name (contains grammar structure markers)
        if (!currentEntry.pattern && (
          cellText.includes('〜') || 
          cellText.includes('～') ||
          cellText.includes('V') ||
          cellText.includes('N') ||
          cellText.includes('うちに') ||
          cellText.includes('間に') ||
          cellText.includes('ながら') ||
          cellText.includes('において') ||
          cellText.includes('にとって') ||
          cellText.includes('について')
        )) {
          currentEntry.pattern = cellText;
        } else if (!currentEntry.meaning && (
          cellText.includes('trong khi') || 
          cellText.includes('trong lúc') ||
          cellText.includes('nghĩa là') ||
          cellText.includes('có nghĩa') ||
          cellText.includes('Giải thích') ||
          cellText.includes('diễn đạt') ||
          cellText.includes('biểu thị')
        )) {
          currentEntry.meaning = cellText;
        } else if (cellText.includes('。') || cellText.includes('。')) {
          // Japanese sentence - it's an example
          currentEntry.examples.push(cellText);
        } else if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(cellText)) {
          // Contains Japanese - treat as pattern or example
          if (!currentEntry.pattern) {
            currentEntry.pattern = cellText;
          } else {
            currentEntry.examples.push(cellText);
          }
        } else if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cellText)) {
          // Vietnamese text - it's meaning
          if (!currentEntry.meaning) {
            currentEntry.meaning = cellText;
          } else {
            currentEntry.notes = (currentEntry.notes ? currentEntry.notes + '\n' : '') + cellText;
          }
        }
      }
    }
  }
}

// Add last entry
if (currentEntry && currentEntry.pattern) {
  grammarEntries.push(currentEntry);
}

console.log('\n=== EXTRACTED GRAMMAR PATTERNS ===');
console.log(`Total patterns found: ${grammarEntries.length}`);

console.log('\n=== FIRST 10 PATTERNS ===');
grammarEntries.slice(0, 10).forEach((g, i) => {
  console.log(`\n--- Pattern ${i + 1} ---`);
  console.log(JSON.stringify(g, null, 2));
});

// Clean up entries - remove empty examples arrays
const cleanedEntries = grammarEntries.map(entry => ({
  ...entry,
  examples: entry.examples.filter(e => e && e.trim()),
  pattern: entry.pattern || `Pattern ${entry.order}`,
  meaning: entry.meaning || ''
})).filter(entry => entry.pattern && entry.pattern !== `Pattern ${entry.order}`);

console.log('\n=== CLEANED ENTRIES ===');
console.log(`Total cleaned entries: ${cleanedEntries.length}`);

// Save to JSON file
fs.writeFileSync('grammar_n3_data.json', JSON.stringify(cleanedEntries, null, 2), 'utf8');
console.log('\n=== SAVED TO grammar_n3_data.json ===');
