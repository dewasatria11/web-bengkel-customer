const fs = require("fs");
const path = "c:/CODINGAN/web-garage/src/pages/admin/AdminOrders.jsx";
const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

let braceCount = 0;
let jsxBraceCount = 0;
let inJSX = false;
let inStr = false;
let strChar = '';
let inComment = false;
let inLineComment = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    
    // Handle strings
    if (!inComment && !inLineComment && !inStr && (ch === '"' || ch === "'" || ch === '`')) {
      inStr = true;
      strChar = ch;
      continue;
    }
    if (inStr) {
      if (ch === strChar && line[j-1] !== '\\') {
        inStr = false;
      }
      continue;
    }
    
    // Handle line comments
    if (!inComment && !inStr && ch === '/' && line[j+1] === '/') {
      inLineComment = true;
      continue;
    }
    if (inLineComment) {
      continue;
    }
    
    // Handle block comments
    if (!inStr && ch === '/' && line[j+1] === '*') {
      inComment = true;
      continue;
    }
    if (inComment && ch === '*' && line[j+1] === '/') {
      inComment = false;
      j++;
      continue;
    }
    if (inComment) {
      continue;
    }
    
    // Handle JSX expressions
    if (ch === '{') {
      if (j + 1 < line.length && line[j+1] === '/') {
        // This is </, not {
      } else {
        jsxBraceCount++;
      }
    }
    if (ch === '}') {
      jsxBraceCount--;
      if (jsxBraceCount < 0) {
        console.log(`Line ${i+1}: unexpected } (count went negative)`);
        jsxBraceCount = 0;
      }
    }
  }
  inLineComment = false;
}

console.log("JSX brace balance at end:", jsxBraceCount);