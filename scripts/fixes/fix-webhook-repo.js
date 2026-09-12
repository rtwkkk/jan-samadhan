const fs = require('fs');
let code = fs.readFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', 'utf8');

code = code.replace(
/if \(\!convUpdate\) throw new Error\('Failed to upsert conversation'\);\n           conversation = convUpdate as any;\n           \n           \/\/ If the operation was an insert, updatedExisting will be false\/undefined in lastErrorObject\n           const lastError = \(convUpdate as any\)\?\.lastErrorObject;\n           conversationWasCreated = lastError \? \!lastError\.updatedExisting : true;/g,
`if (!convUpdate) throw new Error('Failed to upsert conversation');
           conversation = convUpdate.value as any;
           const lastError = convUpdate.lastErrorObject;
           conversationWasCreated = lastError ? !lastError.updatedExisting : true;`
);

fs.writeFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', code);
