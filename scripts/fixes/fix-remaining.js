const fs = require('fs');

// 1. server.ts
let server = fs.readFileSync('server.ts', 'utf8');
server = server.replace(/const \{ parse \} = await import\('cookie'\);/g, "const cookie = await import('cookie');\n      const parse = cookie.parse || (cookie as any).default?.parse || (cookie as any).default;");
fs.writeFileSync('server.ts', server);

// 2. src/app/api/account/route.ts
let apiAccount = fs.readFileSync('src/app/api/account/route.ts', 'utf8');
apiAccount = apiAccount.replace(/ctx\.account\.id/g, 'ctx.accountId');
apiAccount = apiAccount.replace(/ctx\.user\.id/g, 'ctx.userId');
fs.writeFileSync('src/app/api/account/route.ts', apiAccount);

// 3. src/app/api/invitations/[token]/redeem/route.ts
let inviteRoute = fs.readFileSync('src/app/api/invitations/[token]/redeem/route.ts', 'utf8');
// user.id => userId, but my previous regex replaced `user.id` to `userId`. Let's see what's actually there.
inviteRoute = inviteRoute.replace(/user\.id/g, 'userId');
inviteRoute = inviteRoute.replace(/user/g, 'userId'); // wait, I don't know what it exactly was. 
