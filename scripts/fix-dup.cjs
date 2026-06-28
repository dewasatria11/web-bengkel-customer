const fs = require("fs");
const path = "c:/CODINGAN/web-garage/src/pages/admin/AdminOrders.jsx";
let lines = fs.readFileSync(path, "utf8").split(/\r?\n/);
console.log("Before:", lines.length);

// Find the phrase after setMechanics and remove the next stray }; line
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("setMechanics(data || [])")) {
    // lines[i+1] should be "  };"
    // lines[i+2] should be stray "  };"
    if (lines[i+2] && lines[i+2].trim() === "};") {
      lines.splice(i+2, 1);
      console.log("Removed stray } at line", i+3);
      break;
    }
  }
}

fs.writeFileSync(path, lines.join("\r\n") + "\r\n", "utf8");
console.log("After:", lines.length);
