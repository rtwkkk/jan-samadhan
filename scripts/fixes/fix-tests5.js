const fs = require('fs');

// Fix template-webhook.test.ts 'new_qualityScore' issue
let wh = fs.readFileSync('src/lib/whatsapp/template-webhook.test.ts', 'utf8');
wh = wh.replace(/new_qualityScore:/g, 'new_quality_score:');
wh = wh.replace(/previous_qualityScore:/g, 'previous_quality_score:');
fs.writeFileSync('src/lib/whatsapp/template-webhook.test.ts', wh);

// Fix template-body.test.ts mock docs lazy evaluation
let tb = fs.readFileSync('src/lib/whatsapp/template-body.test.ts', 'utf8');
tb = tb.replace(/const mockDocs = rows\.map\(\(r: any\) => \(\{\n[\s\S]*?status: r\.status,\n\s*\}\)\);/g,
  `const getMockDocs = () => rows.map((r: any) => ({
    _id: r.id,
    accountId: filters.account_id || 'acct-1',
    userId: r.user_id || 'u-1',
    name: filters.name || r.name || 'order_update',
    category: r.category,
    language: r.language,
    bodyText: r.body_text,
    status: r.status,
  }));`);
tb = tb.replace(/return Promise\.resolve\(mockDocs\);/g, `return Promise.resolve(getMockDocs());`);
fs.writeFileSync('src/lib/whatsapp/template-body.test.ts', tb);

// Fix send-message.test.ts
// "stores the substituted body when the caller sends no text" -> expecting "Your order A123 ships on Friday", received "null".
// Wait, why did templateContentText return null?
// Because send-message.ts calls resolveTemplateRow which returns null if row isn't found.
// Why wasn't it found? Because `templateRows` didn't have name 'order_update'?
let sm = fs.readFileSync('src/lib/whatsapp/send-message.test.ts', 'utf8');
sm = sm.replace(/_id: row\.id,/g, `_id: row.id,
      accountId: 'acct-1',
      userId: row.user_id || 'u-1',
      name: row.name || 'order_update',`);
fs.writeFileSync('src/lib/whatsapp/send-message.test.ts', sm);
