const fs = require('fs');
let content = fs.readFileSync('src/app/api/v1/contacts/route.test.ts', 'utf8');

content = "import { unauthorized } from '@/lib/api/v1/respond';\n" + content;

content = content.replace(
  /\{ name: 'ApiError', code: 'unauthorized', message: 'Missing or invalid API key', status: 401 \}/,
  "unauthorized()"
);

fs.writeFileSync('src/app/api/v1/contacts/route.test.ts', content);
