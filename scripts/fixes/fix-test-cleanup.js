const fs = require('fs');
let code = fs.readFileSync('test-webhook-transaction.ts', 'utf8');

code = code.replace(/await Message\.deleteMany\(\{ accountId \}\);/g, 
`await Message.deleteMany({ accountId });
  await Contact.deleteMany({ accountId: 'other-account' });
  await Conversation.deleteMany({ accountId: 'other-account' });
  await Message.deleteMany({ accountId: 'other-account' });`);

fs.writeFileSync('test-webhook-transaction.ts', code);
