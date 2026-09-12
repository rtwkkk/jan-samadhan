const fs = require('fs');
let content = fs.readFileSync('src/app/api/v1/contacts/route.ts', 'utf8');

content = content.replace(
  /import \{ requireApiKey \} from '@\/lib\/auth\/api-context';/,
  "import { requireApiAuth } from '@/lib/auth/api-context';"
);

content = content.replace(
  /const ctx = await requireApiKey\(request, 'contacts:read'\);/,
  "const ctx = await requireApiAuth(request, 'contacts:read', 'viewer');"
);

content = content.replace(
  /const ctx = await requireApiKey\(request, 'contacts:write'\);/,
  "const ctx = await requireApiAuth(request, 'contacts:write', 'agent');"
);

fs.writeFileSync('src/app/api/v1/contacts/route.ts', content);
