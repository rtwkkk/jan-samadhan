const fs = require('fs');
let code = fs.readFileSync('src/app/api/account/route.ts', 'utf8');
code = code.replace(/ctx\.account\.id/g, 'ctx.accountId');
code = code.replace(/ctx\.user\.id/g, 'ctx.userId');
fs.writeFileSync('src/app/api/account/route.ts', code);
