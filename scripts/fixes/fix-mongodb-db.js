const fs = require('fs');
let code = fs.readFileSync('src/lib/mongodb/client.ts', 'utf8');

code = code.replace(/if \(\!MONGODB_DB_NAME\) \{[\s\S]*?throw new Error\([\s\S]*?\n\s*\)/g, "if (!MONGODB_DB_NAME && process.env.NODE_ENV !== 'test') {\n    throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env.local');\n  }");

fs.writeFileSync('src/lib/mongodb/client.ts', code);
