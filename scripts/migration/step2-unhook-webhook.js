const fs = require('fs');
let code = fs.readFileSync('src/app/api/whatsapp/webhook/route.ts', 'utf8');

// 1. Strip imports
code = code.replace(/import \{ dispatchInboundToFlows[\s\S]*?\n/g, '');
code = code.replace(/import \{ runAutomationsForTrigger[\s\S]*?\n/g, '');
code = code.replace(/import \{ dispatchInboundToAiReply[\s\S]*?\n/g, '');
code = code.replace(/import \{ flagBroadcastReplyIfAny[\s\S]*?\n/g, '');
code = code.replace(/import \{ dispatchWebhookEvent[\s\S]*?\n/g, '');

// 2. Remove flagBroadcastReplyIfAny at the bottom
code = code.replace(/\/\/ If this contact was a recent broadcast[\s\S]*?await flagBroadcastReplyIfAny\(accountId, contactRecord\.id\)/g, '');

// 3. Remove dispatchWebhookEvent(..., 'conversation.created', ...)
code = code.replace(/if \(txResult\.conversationWasCreated\) \{[\s\S]*?await dispatchWebhookEvent\([\s\S]*?\}[\s\S]*?\n  \}/g, '');

// 4. Remove everything from `// Fire any active flows` to the end of `processMessage`
const startFlows = code.indexOf('// Fire any active flows');
const endProcessMessage = code.indexOf('async function parseMessageContent');
if (startFlows !== -1 && endProcessMessage !== -1) {
  let before = code.substring(0, endProcessMessage);
  let lastBrace = before.lastIndexOf('}');
  code = code.substring(0, startFlows) + '\n}\n\n' + code.substring(endProcessMessage);
}

// 5. Remove dispatchWebhookEvent(..., 'message.status_updated', ...) inside `handleMessageStatus`
code = code.replace(/await dispatchWebhookEvent\(\s*supabaseAdmin\(\),\s*accountId,\s*'message\.status_updated',[\s\S]*?\}\s*\)/g, '');

fs.writeFileSync('src/app/api/whatsapp/webhook/route.ts', code);
