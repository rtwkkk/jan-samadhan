require('dotenv').config({ path: '.env.local' });
const { handleComplaintStatusFlow } = require('../../src/lib/ai/complaint-status-flow');

(async () => {
  const res = await handleComplaintStatusFlow('acc-1', 'CMP-123456');
  console.log(res);
})();
