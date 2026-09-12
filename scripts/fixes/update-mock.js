const fs = require('fs');
let code = fs.readFileSync('src/lib/auth/invitation-service.test.ts', 'utf8');

code = code.replace(/default: \{[\s\S]*?\},/g, `default: {
      startSession: vi.fn().mockResolvedValue(session),
      models: {}
    },`);

fs.writeFileSync('src/lib/auth/invitation-service.test.ts', code);
