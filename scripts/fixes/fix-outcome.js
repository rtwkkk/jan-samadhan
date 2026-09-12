const fs = require('fs');
let code = fs.readFileSync('src/app/api/whatsapp/webhook/route.ts', 'utf8');

code = code.replace(/contactOutcome\.wasCreated/g, 'contactWasCreated');

// Also fix convUpdate possibly null in the reaction fallback:
code = code.replace(/reactConv = convUpdate\.value;/g, 'reactConv = convUpdate?.value || convUpdate as any;');

fs.writeFileSync('src/app/api/whatsapp/webhook/route.ts', code);
