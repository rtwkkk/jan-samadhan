const fs = require('fs');
let code = fs.readFileSync('src/lib/whatsapp/template-header-handle.ts', 'utf8');
code = code.replace(/@\/lib\/webhooks\/ssrf/g, './ssrf');
fs.writeFileSync('src/lib/whatsapp/template-header-handle.ts', code);
let testCode = fs.readFileSync('src/lib/whatsapp/template-header-handle.test.ts', 'utf8');
testCode = testCode.replace(/@\/lib\/webhooks\/ssrf/g, './ssrf');
fs.writeFileSync('src/lib/whatsapp/template-header-handle.test.ts', testCode);
