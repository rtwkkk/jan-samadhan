const fs = require('fs');

let wh = fs.readFileSync('src/lib/whatsapp/template-webhook.test.ts', 'utf8');

wh = wh.replace(/const \{ stub \} = makeSupabaseStub\(\{ data: \[\], error: null \}\);/g, `const stub = null; (MessageTemplateRepository.updateByMetaTemplateId as any).mockResolvedValueOnce(false);`);

fs.writeFileSync('src/lib/whatsapp/template-webhook.test.ts', wh);
