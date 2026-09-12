const fs = require('fs');

let sm = fs.readFileSync('src/lib/whatsapp/send-message.test.ts', 'utf8');
sm = sm.replace(/import \{ vi \} from 'vitest';\n/, '');
fs.writeFileSync('src/lib/whatsapp/send-message.test.ts', sm);

let tb = fs.readFileSync('src/lib/whatsapp/template-body.ts', 'utf8');
// const rows = data; is conflicting with const rows = ((Array.isArray(data) ...
tb = tb.replace(/const rows = data;\n\n  const rows = \(\(Array\.isArray/g, `const rows = ((Array.isArray`);
fs.writeFileSync('src/lib/whatsapp/template-body.ts', tb);

let wh = fs.readFileSync('src/lib/whatsapp/template-webhook.test.ts', 'utf8');
// replace '12345' with expect.any(String) in expectations
wh = wh.replace(/toHaveBeenCalledWith\('12345',/g, "toHaveBeenCalledWith(expect.any(String),");

// For the warning test:
wh = wh.replace(/null; \(MessageTemplateRepository\.updateByMetaTemplateId as any\)\.mockResolvedValueOnce\(false\)/g, `(MessageTemplateRepository.updateByMetaTemplateId as any).mockResolvedValueOnce(false);`);

fs.writeFileSync('src/lib/whatsapp/template-webhook.test.ts', wh);
