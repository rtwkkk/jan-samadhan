const fs = require('fs');
let code = fs.readFileSync('src/lib/auth/account.ts', 'utf8');

code = code.replace("import { type AccountRole, hasMinRole } from './roles';", "import { type AccountRole, hasMinRole } from './roles';\nimport { createClient } from '@/lib/supabase/server';\nimport type { SupabaseClient } from '@supabase/supabase-js';");
code = code.replace("role: AccountRole;", "role: AccountRole;\n  supabase: SupabaseClient;");

code = code.replace("return {", "const supabase = await createClient();\n    return {\n      supabase,");

fs.writeFileSync('src/lib/auth/account.ts', code);
