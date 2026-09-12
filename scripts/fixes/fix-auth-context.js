const fs = require('fs');

// 1. Fix src/app/api/invitations/[token]/redeem/route.ts
let redeem = fs.readFileSync('src/app/api/invitations/[token]/redeem/route.ts', 'utf8');
redeem = redeem.replace(/if \(!userIdId\)/g, 'if (!userId)');
redeem = redeem.replace(/if \(!user\)/g, 'if (!userId)');
fs.writeFileSync('src/app/api/invitations/[token]/redeem/route.ts', redeem);

// 2. Fix src/hooks/use-auth.tsx
let useAuth = fs.readFileSync('src/hooks/use-auth.tsx', 'utf8');
useAuth = useAuth.replace(/avatar_url\?: string;/g, 'avatar_url?: string;\n    created_at?: string;');
fs.writeFileSync('src/hooks/use-auth.tsx', useAuth);

