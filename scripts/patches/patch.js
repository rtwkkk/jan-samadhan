const fs = require('fs');
const file = 'src/lib/ai/complaint-registration-flow.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/"peopleAffected": number or omit,/g, '"peopleAffected": 0,');
code = code.replace(/"isConfirmed": boolean or omit,/g, '"isConfirmed": false,');
code = code.replace(/"isCanceled": boolean or omit/g, '"isCanceled": false');
code = code.replace(/JSON Schema:/g, 'JSON Schema (omit fields if not yet provided by user):');

fs.writeFileSync(file, code);
