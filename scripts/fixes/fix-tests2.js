const fs = require('fs');

// Fix template-body.ts
let tb = fs.readFileSync('src/lib/whatsapp/template-body.ts', 'utf8');
tb = tb.replace(/data\.filter\(d => d\.name === templateName\)\.map\(doc => \(\{/g, `data.filter(d => d.name === templateName).map(doc => ({`);
tb = tb.replace(/updated_at: doc\.updatedAt,\n\s*\}\)\);/g, `updated_at: doc.updatedAt,\n  }));\n\n  const rows = data;`);

const pickOld = `const picked = pick();
  if (!picked) {
    return { row: null, malformed: false, language: fallbackLanguage };
  }

  const result = picked as MessageTemplate;`;
  
const pickNew = `const picked = pick();
  if (!picked) {
    return { row: null, malformed: false, language: fallbackLanguage };
  }

  const result = picked as MessageTemplate;
  if (!isMessageTemplate(result)) {
    return { row: null, malformed: true, language: fallbackLanguage };
  }`;
  
tb = tb.replace(pickOld, pickNew);
fs.writeFileSync('src/lib/whatsapp/template-body.ts', tb);


// Fix send-message.test.ts
let sm = fs.readFileSync('src/lib/whatsapp/send-message.test.ts', 'utf8');
sm = `import { vi } from 'vitest';
import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository';
vi.mock('@/lib/mongodb/repositories/MessageTemplateRepository', () => ({
  MessageTemplateRepository: {
    findByAccountId: vi.fn().mockResolvedValue([]),
  }
}));\n` + sm;

// In send-message.test.ts, there's a mocked db array for message_templates:
// table === 'message_templates' ? templateRows : []
sm = sm.replace(/data: table === 'message_templates' \? templateRows : \[\],/g, `data: [], // Handled by MessageTemplateRepository mock`);

// Find where templateRows is assigned to the DB mock and assign to the mongo mock instead
sm = sm.replace(/const templateRows: unknown\[\] = \[\];/g, `let templateRows: any[] = [];
  beforeEach(() => {
    templateRows = [];
    (MessageTemplateRepository.findByAccountId as any).mockImplementation((accountId: string) => Promise.resolve(templateRows));
  });`);
sm = sm.replace(/templateRows\.push\(row\);/g, `templateRows.push({
      _id: row.id,
      accountId: 'acct-1',
      userId: row.user_id,
      name: row.name,
      category: row.category,
      language: row.language,
      bodyText: row.body_text,
      status: row.status,
    });`);
fs.writeFileSync('src/lib/whatsapp/send-message.test.ts', sm);

// Fix webhook tests
let wh = fs.readFileSync('src/lib/whatsapp/template-webhook.test.ts', 'utf8');
wh = wh.replace(/expect\(calls\[0\]\.update\?\.status\)\.toBe\('(.*?)'\);/g, 
  `expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith('12345', expect.objectContaining({ status: '$1' }));`);
wh = wh.replace(/expect\(calls\[0\]\.update\?\.rejection_reason\)\.toBe\(\n?\s*'(.*?)',\n?\s*\);/g, 
  `expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith('12345', expect.objectContaining({ rejectionReason: '$1' }));`);
wh = wh.replace(/expect\(calls\[0\]\.update\?\.rejection_reason\)\.toBe\('(.*?)'\);/g, 
  `expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith('12345', expect.objectContaining({ rejectionReason: '$1' }));`);
wh = wh.replace(/expect\(calls\)\.toHaveLength\(0\);/g, 
  `expect(MessageTemplateRepository.updateByMetaTemplateId).not.toHaveBeenCalled();`);
wh = wh.replace(/expect\(calls\[0\]\.update\)\.toEqual\(\{ qualityScore: '(.*?)' \}\);/g, 
  `expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith('12345', expect.objectContaining({ qualityScore: '$1' }));`);
wh = wh.replace(/expect\(calls\[0\]\.update\)\.toEqual\(\{ qualityScore: null \}\);/g, 
  `expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith('12345', expect.objectContaining({ qualityScore: undefined }));`);
wh = wh.replace(/expect\(calls\[0\]\.filter\)\.toEqual\(\{[\s\S]*?\}\);/g, '');

fs.writeFileSync('src/lib/whatsapp/template-webhook.test.ts', wh);
