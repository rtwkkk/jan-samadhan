const fs = require('fs');
const file = 'src/app/api/whatsapp/templates/sync/route.ts';
let code = fs.readFileSync(file, 'utf8');

code = `import { NextResponse } from 'next/server'\n` + code;
code = code.replace(/import \{ NextResponse \} from 'next\/server'[\n]+import \{ NextResponse \} from 'next\/server'/g, `import { NextResponse } from 'next/server'`);
code = code.replace(/find\(\(c\) =>/g, `find((c: any) =>`);
code = code.replace(/catch \(err\) \{/g, `catch (err: any) {`);

fs.writeFileSync(file, code);
