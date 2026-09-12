import { checkMongoHealth } from '../../src/lib/mongodb/health';

async function run() {
  process.env.MONGODB_URI = 'mongodb://localhost:27017';
  process.env.MONGODB_DB_NAME = 'wacrm';
  const res = await checkMongoHealth();
  console.log(res);
  process.exit(0);
}
run();
