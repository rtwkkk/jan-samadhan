const fs = require('fs');

let sm = fs.readFileSync('src/lib/whatsapp/send-message.test.ts', 'utf8');

// Inside sendPathDb, populate the mock
sm = sm.replace(/function sendPathDb\([\s\S]*?\): SupabaseClient \{/g, 
  `$&
  const mockDocs = templateRows.map((row: any) => ({
      _id: row.id,
      accountId: 'acct-1',
      userId: row.user_id || 'u-1',
      name: row.name || 'order_update',
      category: row.category,
      language: row.language,
      bodyText: row.body_text,
      status: row.status,
  }));
  (MessageTemplateRepository.findByAccountId as any).mockResolvedValue(mockDocs);
  `);
  
fs.writeFileSync('src/lib/whatsapp/send-message.test.ts', sm);
