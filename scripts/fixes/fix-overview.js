const fs = require('fs');
const file = 'src/components/settings/settings-overview.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/supabase[\s\n]*\.from\('message_templates'\)[\s\n]*\.select\('id', \{ count: 'exact', head: true \}\)[\s\n]*\.eq\('user_id', userId\),[\s\n]*supabase[\s\n]*\.from\('message_templates'\)[\s\n]*\.select\('id', \{ count: 'exact', head: true \}\)[\s\n]*\.eq\('user_id', userId\)[\s\n]*\.eq\('status', 'PENDING'\),/g, 
  "fetch('/api/whatsapp/templates', { cache: 'no-store' }).then((r) => r.json()),\n          Promise.resolve(null), // placeholder to keep Promise.all index aligned");

code = code.replace(/const templatesRes = results\[1\];/g, 'const templatesRes = results[1];');
// The second template res is results[2], which we made null placeholder.

code = code.replace(/templates: templatesRes\.status === 'fulfilled' \? templatesRes\.value\?.count \|\| 0 : 0,[\s\n]*templatesPending:[\s\n]*templatesPendingRes\.status === 'fulfilled' \? templatesPendingRes\.value\?.count \|\| 0 : 0,/g,
  `templates: templatesRes.status === 'fulfilled' && Array.isArray(templatesRes.value) ? templatesRes.value.length : 0,
        templatesPending: templatesRes.status === 'fulfilled' && Array.isArray(templatesRes.value) ? templatesRes.value.filter((t: any) => t.status === 'PENDING').length : 0,`);

fs.writeFileSync(file, code);
