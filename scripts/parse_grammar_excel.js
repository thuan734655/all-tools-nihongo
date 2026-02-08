const XLSX = require('xlsx');
const fs = require('fs');

// Load the Excel file
const workbook = XLSX.readFile('Tổng hợp ngữ pháp N3 hay có trong đề.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('=== EXCEL FILE STRUCTURE ===');
console.log('Sheet name:', sheetName);
console.log('Total rows:', data.length);
console.log('\n=== HEADERS (Row 1) ===');
console.log(data[0]);

console.log('\n=== FIRST 5 DATA ROWS ===');
for (let i = 1; i <= 5 && i < data.length; i++) {
  console.log(`Row ${i}:`, data[i]);
}

// Parse and transform to grammar structure
const headers = data[0] || [];
console.log('\n=== PARSED HEADERS ===');
headers.forEach((h, i) => console.log(`  ${i}: ${h}`));

// Try to extract grammar entries
const grammarEntries = [];
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (row && row.length > 0) {
    // Create grammar object based on column structure
    const entry = {
      id: `grammar_n3_${i}`,
      level: 'N3'
    };
    
    // Map columns to grammar fields
    headers.forEach((header, idx) => {
      if (row[idx] !== undefined && row[idx] !== null && row[idx] !== '') {
        const headerLower = (header || '').toLowerCase();
        if (headerLower.includes('ngữ pháp') || headerLower.includes('pattern') || headerLower.includes('mẫu')) {
          entry.pattern = row[idx];
        } else if (headerLower.includes('nghĩa') || headerLower.includes('meaning') || headerLower.includes('ý nghĩa')) {
          entry.meaning = row[idx];
        } else if (headerLower.includes('ví dụ') || headerLower.includes('example')) {
          entry.example = row[idx];
        } else if (headerLower.includes('giải thích') || headerLower.includes('explanation')) {
          entry.explanation = row[idx];
        } else if (headerLower.includes('ghi chú') || headerLower.includes('note')) {
          entry.notes = row[idx];
        } else if (headerLower.includes('stt') || headerLower.includes('no')) {
          entry.order = row[idx];
        }
      }
    });
    
    // Only add if has pattern
    if (entry.pattern) {
      grammarEntries.push(entry);
    }
  }
}

console.log('\n=== EXTRACTED GRAMMAR ENTRIES ===');
console.log(`Total entries found: ${grammarEntries.length}`);
console.log('\nFirst 3 entries:');
grammarEntries.slice(0, 3).forEach((g, i) => {
  console.log(`\nEntry ${i + 1}:`, JSON.stringify(g, null, 2));
});

// Save to JSON file
fs.writeFileSync('grammar_n3_data.json', JSON.stringify(grammarEntries, null, 2), 'utf8');
console.log('\n=== SAVED TO grammar_n3_data.json ===');
