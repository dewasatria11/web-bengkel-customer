const fs = require("fs");
const path = "c:/CODINGAN/web-garage/src/pages/admin/AdminOrders.jsx";
const buf = fs.readFileSync(path);
const text = buf.toString("utf8");

// Find non-ASCII characters
const nonAscii = [];
for (let i = 0; i < text.length; i++) {
  const code = text.charCodeAt(i);
  if (code > 127) {
    nonAscii.push({ index: i, code, char: text[i] });
  }
}

if (nonAscii.length > 0) {
  console.log("Non-ASCII characters found:");
  nonAscii.slice(0, 20).forEach(c => {
    console.log(`  Index ${c.index}: code ${c.code} char ${JSON.stringify(c.char)}`);
  });
} else {
  console.log("No non-ASCII characters found");
}

// Also check for BOM
if (text.charCodeAt(0) === 0xFEFF) {
  console.log("WARNING: File has BOM!");
}
