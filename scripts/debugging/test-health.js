require('dotenv').config({ path: '.env.local' });
const { checkMongoHealth } = require('./src/lib/mongodb/health.ts');
// since it's TS, I should run it with tsx or ts-node.
