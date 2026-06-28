const fs = require("fs");
const path = "c:/CODINGAN/web-garage/src/pages/admin/AdminOrders.jsx";
let lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

// Replace handleUpdateStatus
let startIdx = null;
let endIdx = null;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const handleUpdateStatus = async (orderId, newStatus) => {")) {
    startIdx = i;
  }
  if (startIdx !== null && lines[i].trim() === "};" && lines[i+1] && lines[i+1].includes("handleMarkAsRead")) {
    endIdx = i;
    break;
  }
}

if (startIdx !== null && endIdx !== null) {
  const newFn = [
    "  const handleUpdateStatus = async (orderId, newStatus) => {",
    "    if (newStatus === 'confirmed') {",
    "      setAssigning(true);",
    "      const mechanic = await autoAssignMechanic(orderId);",
    "      setAssigning(false);",
    "      if (!mechanic) return;",
    "    }",
    "    const updateData = { status: newStatus };",
    "    if (newStatus === 'done' || newStatus === 'cancelled') { updateData.mechanic_id = null; updateData.mechanic_name = ''; }",
    "    const { error } = await supabase",
    "      .from('web_orders')",
    "      .update(updateData)",
    "      .eq('id', orderId);",
    "    if (error) {",
    "      alert('Gagal memperbarui status: ' + error.message);",
    "    } else {",
    "      fetchOrders();",
    "      if (selectedOrder && selectedOrder.id === orderId) {",
    "        setSelectedOrder(prev => ({ ...prev, ...updateData }));",
    "      }",
    "    }",
    "  };",
  ];
  lines.splice(startIdx, endIdx - startIdx + 1, ...newFn);
  console.log("Replaced handleUpdateStatus");
}

fs.writeFileSync(path, lines.join("\r\n") + "\r\n", "utf8");
console.log("Done");
