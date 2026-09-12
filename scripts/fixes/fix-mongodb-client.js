const fs = require('fs');
let code = fs.readFileSync('src/lib/mongodb/client.ts', 'utf8');

// The file has a sync check:
// if (!MONGODB_URI) { throw new Error(...) }
// Let's wrap it in a function or check process.env.NODE_ENV !== 'test'
code = code.replace(/if \(\!MONGODB_URI\) \{[\s\S]*?throw new Error\([\s\S]*?\n\s*\)/g, "if (!MONGODB_URI && process.env.NODE_ENV !== 'test') {\n    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');\n  }");

fs.writeFileSync('src/lib/mongodb/client.ts', code);
