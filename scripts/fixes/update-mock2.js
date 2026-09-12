const fs = require('fs');
let code = fs.readFileSync('src/lib/auth/invitation-service.test.ts', 'utf8');

code = code.replace(/models: \{\}/g, `models: {},
      model: vi.fn()`);

fs.writeFileSync('src/lib/auth/invitation-service.test.ts', code);
