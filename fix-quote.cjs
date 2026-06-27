const fs = require("fs");
const path = "c:/CODINGAN/web-garage/src/pages/admin/AdminOrders.jsx";
let text = fs.readFileSync(path, "utf8");
const lines = text.split(/\r?\n/);
console.log("Before cleanup:", lines.length, "lines");
if (lines[lines.length - 1].trim() === '"') {
  lines.pop();
  fs.writeFileSync(path, lines.join("\r\n") + "\r\n", "utf8");
  console.log("Removed trailing quote line");
} else {
  console.log("Last line:", JSON.stringify(lines[lines.length - 1]));
}
