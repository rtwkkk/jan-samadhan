const fs = require('fs');
let content = fs.readFileSync('src/lib/auth/api-context.ts', 'utf8');

content = content.replace(
  /export async function requireApiAuth\(request: Request, scope\?: ApiScope\) \{/,
  "export async function requireApiAuth(request: Request, scope?: ApiScope, minRole: 'viewer' | 'agent' | 'admin' = 'viewer') {"
);

content = content.replace(
  /const roleCtx = await requireRole\('viewer'\);/,
  "const roleCtx = await requireRole(minRole);"
);

fs.writeFileSync('src/lib/auth/api-context.ts', content);
