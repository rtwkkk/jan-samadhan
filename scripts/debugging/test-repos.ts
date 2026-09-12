import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import { connectToDatabase } from '../../src/lib/mongodb/client';
import { MessageRepository } from '../../src/lib/mongodb/repositories/MessageRepository';
import { ContactRepository } from '../../src/lib/mongodb/repositories/ContactRepository';

async function runTests() {
  await connectToDatabase();
  const accountId1 = 'acct-1';
  const accountId2 = 'acct-2';

  console.log('--- Testing Isolation ---');
  // 1. Create a contact in account 1
  const contact = await ContactRepository.create({ _id: 'cont-1', accountId: accountId1, phone: '12345' });
  
  // 2. Try to find it in account 2
  const notFound = await ContactRepository.findById(accountId2, 'cont-1');
  console.log('Cross-account find blocked?', notFound === null);

  // 3. Try to update it in account 2
  const notUpdated = await ContactRepository.updateById(accountId2, 'cont-1', { name: 'Hacked' });
  console.log('Cross-account update blocked?', notUpdated === null);
  
  // 4. Try to delete it in account 2
  const notDeleted = await ContactRepository.deleteById(accountId2, 'cont-1');
  console.log('Cross-account delete blocked?', notDeleted === false);
  
  // 5. Try to change ownership in account 1
  await ContactRepository.updateById(accountId1, 'cont-1', { accountId: accountId2, name: 'Legit' } as any);
  const checkOwnership = await ContactRepository.findById(accountId1, 'cont-1');
  console.log('Ownership change prevented?', checkOwnership?.accountId === accountId1 && checkOwnership?.name === 'Legit');

  console.log('--- Testing Idempotency ---');
  // 6. Test Upsert with messageId
  const msg1 = await MessageRepository.upsertByMessageId(accountId1, 'conv-1', 'wamid.123', {
    _id: 'msg-1', conversationId: 'conv-1', senderType: 'customer', contentText: 'Hello'
  });
  const msg2 = await MessageRepository.upsertByMessageId(accountId1, 'conv-1', 'wamid.123', {
    _id: 'msg-1', conversationId: 'conv-1', senderType: 'customer', contentText: 'Hello again'
  });
  
  console.log('Duplicate message ID returns same document?', msg1._id.toString() === msg2._id.toString());
  
  // Cleanup test data
  await mongoose.connection.db?.dropDatabase();
  console.log('Tests finished, database cleaned.');
  process.exit(0);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
