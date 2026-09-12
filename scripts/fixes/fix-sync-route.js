const fs = require('fs');
const file = 'src/app/api/whatsapp/templates/sync/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace imports
code = code.replace(/import \{ createClient \} from '@\/lib\/supabase\/server'\n/, '');
code = code.replace(/import \{ getCurrentAccount \/\/.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n/s, `import { getCurrentAccount } from '@/lib/auth/account'
import { WhatsappConfigRepository } from '@/lib/mongodb/repositories/WhatsappConfigRepository'
import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository'
`);

// Or just do string replacements manually using sed/awk or a small node script.
