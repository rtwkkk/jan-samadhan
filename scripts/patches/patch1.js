const fs = require('fs');
const file = 'src/lib/ai/conversation-handler.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `"Maaf karna, abhi kuch technical problem hai. Thodi der mein try karein."`,
  `"Sorry ji, abhi thodi technical problem aa rahi hai. Ek baar phir se bataiye."`
);

fs.writeFileSync(file, code);
