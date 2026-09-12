const fs = require('fs');
let code = fs.readFileSync('src/lib/mongodb/client.ts', 'utf8');
code = code.replace("  }\n}\n", "  }\n\n");
fs.writeFileSync('src/lib/mongodb/client.ts', code);
