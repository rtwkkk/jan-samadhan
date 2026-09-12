const fs = require('fs');
let code = fs.readFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', 'utf8');

code = code.replace(/if \(!convUpdate\) throw new Error\('Failed to upsert conversation'\);\n           conversation = convUpdate\.value as any;/g, 
`if (!convUpdate) throw new Error('Failed to upsert conversation');
           // Mongoose rawResult might return { value: doc } or just doc in some versions.
           conversation = convUpdate.value || convUpdate;
           if (!conversation || !conversation._id) {
               console.error("DEBUG convUpdate:", JSON.stringify(convUpdate));
               throw new Error('Failed to get conversation from convUpdate');
           }`);

fs.writeFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', code);
