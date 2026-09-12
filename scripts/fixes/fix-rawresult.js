const fs = require('fs');

let webCode = fs.readFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', 'utf8');
webCode = webCode.replace(/rawResult: true/g, 'includeResultMetadata: true');
fs.writeFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', webCode);

let msgCode = fs.readFileSync('src/lib/mongodb/repositories/MessageRepository.ts', 'utf8');
msgCode = msgCode.replace(/rawResult: true/g, 'includeResultMetadata: true');
fs.writeFileSync('src/lib/mongodb/repositories/MessageRepository.ts', msgCode);

