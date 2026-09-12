const fs = require('fs');
let code = fs.readFileSync('src/lib/auth/server.ts', 'utf8');

// The original file had a dummy setSessionCookie at the bottom, then I appended the real one.
// Let's remove the dummy one.
code = code.replace(/export function setSessionCookie\(rawToken: string\) \{\s*\/\/ To be used by Route Handlers or Server Actions\s*\/\/ Note: we can't directly await cookies\(\) and mutate in all contexts cleanly unless it's a Server Action.\s*\/\/ We'll expose this for login.\s*\}/g, '');

fs.writeFileSync('src/lib/auth/server.ts', code);
