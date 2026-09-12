const fs = require('fs');
let code = fs.readFileSync('src/lib/contacts/tag-events.ts', 'utf8');

// Strip imports
code = code.replace(/import \{ runAutomationsForTrigger \} from '@\/lib\/automations\/engine';\n/g, '');

// Strip invocation
// We want to replace `await runAutomationsForTrigger({ ... })` completely
code = code.replace(/await runAutomationsForTrigger\(\{[\s\S]*?\}\);/g, '');

fs.writeFileSync('src/lib/contacts/tag-events.ts', code);
