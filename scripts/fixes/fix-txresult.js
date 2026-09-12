const fs = require('fs');
let code = fs.readFileSync('src/app/api/whatsapp/webhook/route.ts', 'utf8');

code = code.replace('reactConv = convUpdate.value;', 'reactConv = convUpdate?.value || null;');

fs.writeFileSync('src/app/api/whatsapp/webhook/route.ts', code);
