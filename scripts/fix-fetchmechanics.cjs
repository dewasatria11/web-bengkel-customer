const fs = require("fs");
const path = "c:/CODINGAN/web-garage/src/pages/admin/AdminOrders.jsx";

function readLines(p) {
  return fs.readFileSync(p, "utf8").split(/\r?\n/);
}
function writeLines(p, lines) {
  fs.writeFileSync(p, lines.join("\r\n") + "\r\n", "utf8");
}

let lines = readLines(path);
console.log("Lines before:", lines.length);

// Find the line with "setLoading(false);" that belongs to fetchOrders
let insertIdx = null;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("setLoading(false);") && lines[i+1] && lines[i+1].trim() === "};") {
    insertIdx = i + 1;
    break;
  }
}

if (insertIdx !== null) {
  const fn = [
    "",
    "  const fetchMechanics = async () => {",
    "    const { data } = await supabase",
    "      .from('mechanics')",
    "      .select('id, name, is_active')",
    "      .eq('is_active', true)",
    "      .order('name');",
    "    setMechanics(data || []);",
    "  };",
  ];
  lines.splice(insertIdx, 0, ...fn);
  console.log("Inserted fetchMechanics at line", insertIdx + 1);
} else {
  console.log("Could not find insertion point");
}

writeLines(path, lines);
console.log("Lines after:", readLines(path).length);
