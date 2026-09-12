const fs = require('fs');
let content = fs.readFileSync('src/lib/whatsapp/send-message.test.ts', 'utf8');

// Replace:
// sendMessageToConversation(
//   sendPathDb([TEMPLATE_ROW], captured),
//   'acct-1',
content = content.replace(/sendMessageToConversation\([\s]*sendPathDb[^,]+,[\s]*'acct-1',/g, "sendMessageToConversation('acct-1',");
content = content.replace(/sendMessageToConversation\([\s]*sendPathDb[^,]+,\s*'acct-1',/g, "sendMessageToConversation('acct-1',");

fs.writeFileSync('src/lib/whatsapp/send-message.test.ts', content);
