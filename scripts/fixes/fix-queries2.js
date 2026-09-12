const fs = require('fs');
let code = fs.readFileSync('src/lib/dashboard/queries.ts', 'utf8');
code = code.replace(/autoLogs: autoLogs\.data \?\? \[\]/g, 'autoLogs: []');
fs.writeFileSync('src/lib/dashboard/queries.ts', code);
