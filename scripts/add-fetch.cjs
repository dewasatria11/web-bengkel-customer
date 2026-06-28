const fs = require("fs");
const path = "c:/CODINGAN/web-garage/src/pages/admin/AdminOrders.jsx";
let lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

// Find the closing }; of fetchOrders and insert fetchMechanics after it
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === "};" && lines[i+1] && lines[i+1].includes("useEffect")) {
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
    lines.splice(i + 1, 0, ...fn);
    console.log("Inserted fetchMechanics at line", i + 2);
    break;
  }
}

fs.writeFileSync(path, lines.join("\r\n") + "\r\n", "utf8");
console.log("Done, total lines:", lines.length);
