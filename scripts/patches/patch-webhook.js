const fs = require('fs');

let code = fs.readFileSync('src/app/api/whatsapp/webhook/route.ts', 'utf8');

// Add import if not exists
if (!code.includes('handleAiConversation')) {
  // Find the last import and add our import
  const importRegex = /import .* from '.*'/g;
  let lastMatch = null;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    lastMatch = match;
  }
  
  if (lastMatch) {
    const pos = lastMatch.index + lastMatch[0].length;
    code = code.slice(0, pos) + "\nimport { handleAiConversation } from '@/lib/ai/conversation-handler';" + code.slice(pos);
  }
}

// Find the insertion point
const searchString = `if (!txResult.messageWasCreated) {
    console.info('[webhook] duplicate inbound message ignored (idempotent replay):', message.id)
    return
  }`;

if (code.includes(searchString)) {
  const replacementString = `${searchString}

  // Pass to AI handler if there is text content
  if (content?.contentText) {
    await handleAiConversation(accountId, txResult.conversation._id, content.contentText);
  }`;
  
  code = code.replace(searchString, replacementString);
  fs.writeFileSync('src/app/api/whatsapp/webhook/route.ts', code);
  console.log("Successfully patched route.ts");
} else {
  console.log("Could not find insertion point in route.ts");
}
