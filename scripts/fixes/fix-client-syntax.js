const fs = require('fs');

let client = fs.readFileSync('src/lib/mongodb/client.ts', 'utf8');

// I might have replaced it into something with an extra curly brace. Let's see what is there.
client = client.replace("if (!MONGODB_URI && process.env.NODE_ENV !== 'test') {\n    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');\n  }\n}", "if (!MONGODB_URI && process.env.NODE_ENV !== 'test') {\n    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');\n  }");

fs.writeFileSync('src/lib/mongodb/client.ts', client);
