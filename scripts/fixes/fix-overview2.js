const fs = require('fs');
const file = 'src/components/settings/settings-overview.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/templates:[\s\S]*?templatesPending:[\s\S]*?tags:/, 
  `templates: templatesTotal.status === 'fulfilled' && Array.isArray(templatesTotal.value) ? templatesTotal.value.length : null,
        templatesPending: templatesTotal.status === 'fulfilled' && Array.isArray(templatesTotal.value) ? templatesTotal.value.filter((t: any) => t.status === 'PENDING').length : null,
        tags:`);

fs.writeFileSync(file, code);
