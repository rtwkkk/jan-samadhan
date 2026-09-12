import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { checkMongoHealth } from '../../src/lib/mongodb/health';

checkMongoHealth().then(res => {
  console.log("HEALTH CHECK RESULT:", res);
  process.exit(0);
}).catch(err => {
  console.error("HEALTH CHECK ERROR:", err);
  process.exit(1);
});
