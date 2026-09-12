const fs = require('fs');
let code = fs.readFileSync('src/app/api/whatsapp/webhook/route.ts', 'utf8');

const startTarget = '  // ============================================================';
const endTarget = 'async function parseMessageContent';

const startIdx = code.indexOf(startTarget);
const endIdx = code.indexOf(endTarget);

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + '\n}\n\n' + code.substring(endIdx);
}
fs.writeFileSync('src/app/api/whatsapp/webhook/route.ts', code);
