const fs = require('fs');
let content = fs.readFileSync('src/app/api/v1/contacts/route.test.ts', 'utf8');
content = content.replace(
  /Object.assign\(new Error\('Unauthorized'\), \{ status: 401 \}\)/,
  "{ name: 'ApiError', code: 'unauthorized', message: 'Missing or invalid API key', status: 401 }"
);
fs.writeFileSync('src/app/api/v1/contacts/route.test.ts', content);
