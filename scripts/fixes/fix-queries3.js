const fs = require('fs');
let code = fs.readFileSync('src/lib/dashboard/queries.ts', 'utf8');
code = code.replace(/for \(const l of \(autoLogs\.data \?\? \[\]\) as unknown as Array<\{[\s\S]*?\}\>\) \{[\s\S]*?\}\n/g, '');
fs.writeFileSync('src/lib/dashboard/queries.ts', code);
