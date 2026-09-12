const fs = require('fs');
let code = fs.readFileSync('test-webhook-transaction.ts', 'utf8');

code = code.replace(/throw new Error\('TEST 2 FAILED: Expected duplicate to be ignored'\);/g, 
`console.log("DEBUG res2:", { msg: res2.messageWasCreated, con: res2.contactWasCreated, conv: res2.conversationWasCreated }); throw new Error('TEST 2 FAILED: Expected duplicate to be ignored');`);

fs.writeFileSync('test-webhook-transaction.ts', code);
