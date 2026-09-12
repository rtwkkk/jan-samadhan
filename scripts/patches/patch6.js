const fs = require('fs');
const file = 'src/lib/ai/complaint-registration-flow.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `"\\nShould I submit this complaint? (Yes / No)"`,
  `"\\nKya ye sahi hai? (Haan / Nahi bhejein)"`
);

fs.writeFileSync(file, code);
