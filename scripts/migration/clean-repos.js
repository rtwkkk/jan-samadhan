const fs = require('fs');

let msgCode = fs.readFileSync('src/lib/mongodb/repositories/MessageRepository.ts', 'utf8');
msgCode = msgCode.replace(/console\.log\("DEBUG msgUpsert:", JSON\.stringify\(doc\)\);\n/g, '');
fs.writeFileSync('src/lib/mongodb/repositories/MessageRepository.ts', msgCode);

let webCode = fs.readFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', 'utf8');
webCode = webCode.replace(/console\.error\("DEBUG convUpdate:", JSON\.stringify\(convUpdate\)\);\n/g, '');
fs.writeFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', webCode);

