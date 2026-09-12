const fs = require('fs');
let code = fs.readFileSync('test-repos.ts', 'utf8');
code = code.replace(
  /MessageRepository\.upsertByMessageId\(accountId1, 'wamid\.123'/g,
  "MessageRepository.upsertByMessageId(accountId1, 'conv-1', 'wamid.123'"
);
fs.writeFileSync('test-repos.ts', code);
