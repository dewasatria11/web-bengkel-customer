const fs = require("fs");
const path = "c:/CODINGAN/web-garage/src/pages/admin/AdminOrders.jsx";
let lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const autoAssignMechanic")) {
    const fn = [
      "  const fetchMechanics = async () => {",
      "    const { data } = await supabase",
      "      .from('mechanics')",
      "      .select('id, name, is_active')",
      "      .eq('is_active', true)",
      "      .order('name');",
      "    setMechanics(data || []);",
      "  };",
      "",
    ];
    lines.splice(i, 0, ...fn);
    console.log("Inserted fetchMechanics before line", i + 1);
    break;
  }
}

fs.writeFileSync(path, lines.join("\r\n") + "\r\n", "utf8");
console.log("Done");
