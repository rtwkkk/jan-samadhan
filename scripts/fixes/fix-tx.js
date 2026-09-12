const fs = require('fs');
let code = fs.readFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', 'utf8');

code = code.replace(/const convUpdate = await mongoose\.connection\.collection\('conversations'\)\.findOneAndUpdate\(\n\s*\{ accountId, contactId: contact\._id \},\n\s*\{ \n\s*\$setOnInsert: \{ \n\s*_id: crypto\.randomUUID\(\),\n\s*accountId, \n\s*contactId: contact\._id,\n\s*userId: configOwnerUserId,\n\s*createdAt: new Date\(\),\n\s*updatedAt: new Date\(\),\n\s*unreadCount: 0,\n\s*status: 'open'\n\s*\} \n\s*\},\n\s*\{ upsert: true, returnDocument: 'after', session \}\n\s*\);\n           \n\s*if \(\!convUpdate\) throw new Error\('Failed to upsert conversation'\);\n\s*conversation = convUpdate\.value as any;\n\s*const lastError = convUpdate\.lastErrorObject;\n\s*conversationWasCreated = lastError \? \!lastError\.updatedExisting : true;/g,
`const { Conversation } = await import('../models/Conversation');
           const convUpdate = await Conversation.findOneAndUpdate(
             { accountId, contactId: contact._id },
             { 
               $setOnInsert: { 
                 _id: crypto.randomUUID(),
                 accountId, 
                 contactId: contact._id,
                 userId: configOwnerUserId,
                 createdAt: new Date(),
                 updatedAt: new Date(),
                 unreadCount: 0,
                 status: 'open'
               } 
             },
             { upsert: true, new: true, session, rawResult: true }
           );
           
           if (!convUpdate) throw new Error('Failed to upsert conversation');
           conversation = convUpdate.value as any;
           const lastError = (convUpdate as any).lastErrorObject;
           conversationWasCreated = lastError ? !lastError.updatedExisting : true;`);

fs.writeFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', code);
