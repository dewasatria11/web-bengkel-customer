const fs = require("fs");
const path = "c:/CODINGAN/web-garage/src/pages/admin/AdminOrders.jsx";

function readLines(p) {
  return fs.readFileSync(p, "utf8").split(/\r?\n/);
}
function writeLines(p, lines) {
  fs.writeFileSync(p, lines.join("\r\n") + "\r\n", "utf8");
}

let lines = readLines(path);
console.log("Current lines:", lines.length);

// Step 1: Add mechanics/assigning state after storeName
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const [storeName, setStoreName] = useState('EGA GARAGE');")) {
    lines.splice(i + 1, 0,
      "  const [mechanics, setMechanics] = useState([]);",
      "  const [assigning, setAssigning] = useState(false);",
      ""
    );
    console.log("Added state variables after line", i + 1);
    break;
  }
}

// Step 2: Add fetchMechanics function after fetchOrders
let fetchIdx = null;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const fetchOrders = async () => {") && lines[i+1] && lines[i+1].includes("setLoading(true);")) {
    // Find the closing of fetchOrders
    for (let j = i; j < lines.length; j++) {
      if (lines[j].trim() === "};" && lines[j+1] && lines[j+1].includes("useEffect")) {
        fetchIdx = j + 1;
        break;
      }
    }
    break;
  }
}
if (fetchIdx !== null) {
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
  lines.splice(fetchIdx, 0, ...fn);
  console.log("Added fetchMechanics at line", fetchIdx + 1);
}

// Step 3: Add autoAssignMechanic before handleUpdateStatus
let handleIdx = null;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const handleUpdateStatus = async (orderId, newStatus) => {")) {
    handleIdx = i;
    break;
  }
}
if (handleIdx !== null) {
  const fn = [
    "",
    "  const autoAssignMechanic = async (orderId) => {",
    "    const { data: busyOrders } = await supabase",
    "      .from('web_orders')",
    "      .select('mechanic_id')",
    "      .eq('status', 'confirmed');",
    "    const busyIds = new Set((busyOrders || []).map(o => o.mechanic_id).filter(Boolean));",
    "    const { data: available } = await supabase",
    "      .from('mechanics')",
    "      .select('id, name')",
    "      .eq('is_active', true)",
    "      .order('name');",
    "    const free = (available || []).find(m => !busyIds.has(m.id));",
    "    if (!free) {",
    "      alert('Tidak ada mekanik tersedia saat ini. Semua mekanik sedang sibuk.');",
    "      return null;",
    "    }",
    "    const { error } = await supabase",
    "      .from('web_orders')",
    "      .update({ mechanic_id: free.id, mechanic_name: free.name })",
    "      .eq('id', orderId);",
    "    if (error) {",
    "      console.error('Gagal assign mekanik:', error);",
    "      alert('Gagal assign mekanik: ' + error.message);",
    "      return null;",
    "    }",
    "    return free;",
    "  };",
  ];
  lines.splice(handleIdx, 0, ...fn);
  console.log("Added autoAssignMechanic at line", handleIdx + 1);
}

writeLines(path, lines);
console.log("Step 1-3 done, lines:", lines.length);
