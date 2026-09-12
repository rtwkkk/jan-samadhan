const fs = require('fs');

let sync = fs.readFileSync('src/app/api/whatsapp/templates/sync/route.ts', 'utf8');
sync = sync.replace(/buttons: parsedButtons\.length \? parsedButtons : null,/g, 'buttons: parsedButtons.length ? parsedButtons : undefined,');
sync = sync.replace(/sampleValues: sampleValues,/g, 'sampleValues: sampleValues || undefined,');
fs.writeFileSync('src/app/api/whatsapp/templates/sync/route.ts', sync);

let submit = fs.readFileSync('src/app/api/whatsapp/templates/submit/route.ts', 'utf8');
submit = submit.replace(/import type \{ TemplatePayload \} from '@\/types'/g, '');
fs.writeFileSync('src/app/api/whatsapp/templates/submit/route.ts', submit);
