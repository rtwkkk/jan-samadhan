const fs = require('fs');
let tb = fs.readFileSync('src/lib/whatsapp/template-body.ts', 'utf8');
tb = tb.replace(/const rows = data;\n\n  const rows = \(\(Array\.isArray/g, `const rows = ((Array.isArray`);
// wait, my previous regex failed because of spacing probably. I'll just use string replace.
tb = tb.replace("const rows = data;\n\n  const rows =", "  const rows =");
fs.writeFileSync('src/lib/whatsapp/template-body.ts', tb);

// Fix webhook test YELLOW expected vs undefined
let wh = fs.readFileSync('src/lib/whatsapp/template-webhook.test.ts', 'utf8');
wh = wh.replace(/expect\(MessageTemplateRepository\.updateByMetaTemplateId\)\.toHaveBeenCalledWith\(expect\.any\(String\), expect\.objectContaining\(\{ qualityScore: '(.*?)' \}\)\);/g, 
  "expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ qualityScore: 'YELLOW' }));");
// wait, let's just restore the manual YELLOW expectation
wh = wh.replace(/expect\.objectContaining\(\{ qualityScore: 'YELLOW' \}\)/g, `expect.objectContaining({ qualityScore: 'YELLOW' })`);
fs.writeFileSync('src/lib/whatsapp/template-webhook.test.ts', wh);
