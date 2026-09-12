const fs = require('fs');
let code = fs.readFileSync('src/lib/mongodb/repositories/MessageRepository.ts', 'utf8');

code = code.replace(/const lastError = \(doc as any\)\.lastErrorObject;/g,
`console.log("DEBUG msgUpsert:", JSON.stringify(doc));
    const lastError = (doc as any).lastErrorObject;`);

fs.writeFileSync('src/lib/mongodb/repositories/MessageRepository.ts', code);
