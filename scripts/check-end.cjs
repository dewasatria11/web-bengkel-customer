const fs = require("fs");
const path = "c:/CODINGAN/web-garage/src/pages/admin/AdminOrders.jsx";
const buf = fs.readFileSync(path);
console.log("File size:", buf.length);
const tail = buf.slice(-200);
console.log("Last 200 bytes:", [...tail].map(b => {
  if (b === 10) return '\\n';
  if (b === 13) return '\\r';
  return String.fromCharCode(b);
}).join(""));
