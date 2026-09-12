const fs = require('fs');
let code = fs.readFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', 'utf8');

code = code.replace(/createdAt: new Date\(\),\n\s*updatedAt: new Date\(\),\n/g, '');

fs.writeFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', code);
