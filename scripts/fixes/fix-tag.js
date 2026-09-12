const fs = require('fs');
let code = fs.readFileSync('src/lib/contacts/tag-events.ts', 'utf8');
code = code.replace(/import \{\n\s*runAutomationsForTrigger,\n\s*type AutomationContext,\n\} from '@\/lib\/automations\/engine';/g, '');
code = code.replace(/context\?: AutomationContext/g, 'context?: any');
fs.writeFileSync('src/lib/contacts/tag-events.ts', code);
