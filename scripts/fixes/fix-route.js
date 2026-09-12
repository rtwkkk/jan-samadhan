const fs = require('fs');

// 1. src/app/api/account/route.ts
let code = fs.readFileSync('src/app/api/account/route.ts', 'utf8');
code = code.replace("const ctx = await getCurrentAccount();", "const { requireAuth } = await import('@/lib/auth/server');\n    const auth = await requireAuth();\n    const ctx = await getCurrentAccount();");
code = code.replace("account: ctx.account", "account: auth.account");
fs.writeFileSync('src/app/api/account/route.ts', code);

// 2. server.ts
let server = fs.readFileSync('server.ts', 'utf8');
server = server.replace("const parse = cookie.parse || (cookie as any).default?.parse || (cookie as any).default;", "const parse = (cookie as any).parse || (cookie as any).default?.parse || (cookie as any).default;");
fs.writeFileSync('server.ts', server);

