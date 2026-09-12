const fs = require('fs');
let code = fs.readFileSync('src/components/settings/password-form.tsx', 'utf8');

code = code.replace(/import \{ createClient \} from '@\/lib\/supabase\/client';\n/g, '');
code = code.replace(/const supabase = createClient\(\);\n/g, '');

const updateLogic = `
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current, next })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t('passwordUpdateFailed', { message: data.error }));
        return;
      }
`;

// Replacing everything from "const { error: signInError }" to "if (updateError) { ... return; }"
code = code.replace(/\s*const \{ error: signInError \} = await supabase\.auth\.signInWithPassword\(\{[\s\S]*?if \(updateError\) \{[\s\S]*?return;\s*\}/, updateLogic);

fs.writeFileSync('src/components/settings/password-form.tsx', code);
