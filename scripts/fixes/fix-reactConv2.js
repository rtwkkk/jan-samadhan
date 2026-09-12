const fs = require('fs');
let code = fs.readFileSync('src/app/api/whatsapp/webhook/route.ts', 'utf8');

code = code.replace(/conversation = \{ id: reactConv\._id \};/g, 'conversation = { id: reactConv!._id };');

fs.writeFileSync('src/app/api/whatsapp/webhook/route.ts', code);
