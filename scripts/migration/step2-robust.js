const fs = require('fs');
let code = fs.readFileSync('src/app/api/whatsapp/webhook/route.ts', 'utf8');

const startTarget = '// Awaited (not fire-and-forget) because we need the `consumed`';
const endTarget = 'async function parseMessageContent';

const startIdx = code.indexOf(startTarget);
const endIdx = code.indexOf(endTarget);

if (startIdx !== -1 && endIdx !== -1) {
  // we want to cut everything and just close the processMessage function properly.
  let beforeEnd = code.substring(0, endIdx);
  let lastBrace = beforeEnd.lastIndexOf('}'); // this might just be the brace closing processMessage, we don't want to cut that.
  
  // Wait, if we just replace it with `}\n\n`
  code = code.substring(0, startIdx) + '\n}\n\n' + code.substring(endIdx);
}
fs.writeFileSync('src/app/api/whatsapp/webhook/route.ts', code);
