const fs = require('fs');

let sm = fs.readFileSync('src/lib/whatsapp/send-message.test.ts', 'utf8');
sm = sm.replace(/\(MessageTemplateRepository\.findByAccountId as any\)\.mockImplementation\(\(accountId: string\) => Promise\.resolve\(templateRows\)\);/g, 
  `(MessageTemplateRepository.findByAccountId as any).mockImplementation((accountId: string) => {
      // console.log("MOCKED findByAccountId CALLED!", templateRows);
      return Promise.resolve(templateRows);
    });`);
fs.writeFileSync('src/lib/whatsapp/send-message.test.ts', sm);

let wh = fs.readFileSync('src/lib/whatsapp/template-webhook.test.ts', 'utf8');
wh = wh.replace(/\(MessageTemplateRepository\.updateByMetaTemplateId as any\)\.mockResolvedValueOnce\(false\);/g, 
  `// (MessageTemplateRepository.updateByMetaTemplateId as any).mockResolvedValueOnce(false);
    (MessageTemplateRepository.updateByMetaTemplateId as any).mockResolvedValueOnce(false);`);
fs.writeFileSync('src/lib/whatsapp/template-webhook.test.ts', wh);
