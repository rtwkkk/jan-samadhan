const fs = require('fs');
let code = fs.readFileSync('src/lib/contacts/tag-events.ts', 'utf8');
// just remove all lines mentioning automations
code = code.split('\n').filter(line => !line.includes('automations')).join('\n');
fs.writeFileSync('src/lib/contacts/tag-events.ts', code);
