import { connectToDatabase } from '../../src/lib/mongodb/client';
import { MessageRepository } from '../../src/lib/mongodb/repositories/MessageRepository';
import { Message } from '../../src/lib/mongodb/models/Message';
import * as crypto from 'crypto';

async function run() {
  const mongoose = await connectToDatabase();
  
  // Clean up any old index from the local DB.
  // We need to drop `{ messageId: 1 }` if it exists.
  try {
    await Message.collection.dropIndex('messageId_1');
    console.log('Dropped old messageId_1 index');
  } catch (err: any) {
    // Ignore if it doesn't exist
  }

  // Ensure new indexes are built
  await Message.syncIndexes();
  console.log('Indexes synchronized');

  const accountA = crypto.randomUUID();
  const accountB = crypto.randomUUID();
  
  const conv1 = crypto.randomUUID();
  const conv2 = crypto.randomUUID();
  const conv3 = crypto.randomUUID();

  const metaId = 'META-123';

  // Cleanup before tests
  await Message.deleteMany({ accountId: { $in: [accountA, accountB] } });

  console.log('TEST 1: Same message ID, same conversation');
  const msg1Id = crypto.randomUUID();
  await MessageRepository.upsertByMessageId(accountA, conv1, metaId, {
    _id: msg1Id,
    accountId: accountA,
    conversationId: conv1,
    senderType: 'customer',
    contentText: 'First insert',
    status: 'delivered'
  });

  const msg1Duplicate = await MessageRepository.upsertByMessageId(accountA, conv1, metaId, {
    _id: crypto.randomUUID(), // New UUID, but should be ignored by idempotency
    accountId: accountA,
    conversationId: conv1,
    senderType: 'customer',
    contentText: 'Duplicate insert',
    status: 'delivered'
  });

  console.log('TEST 1 Result: ' + (msg1Duplicate._id === msg1Id ? 'PASSED (Duplicate prevented)' : 'FAILED'));
  console.log('TEST 1 Content: ' + msg1Duplicate.contentText); // Should be 'Duplicate insert' because upsert updates existing row

  console.log('\nTEST 2: Same message ID, different conversation');
  const msg2Id = crypto.randomUUID();
  const msg2 = await MessageRepository.upsertByMessageId(accountA, conv2, metaId, {
    _id: msg2Id,
    accountId: accountA,
    conversationId: conv2,
    senderType: 'customer',
    contentText: 'Different conversation',
    status: 'delivered'
  });

  console.log('TEST 2 Result: ' + (msg2._id === msg2Id ? 'PASSED (Allowed)' : 'FAILED'));

  console.log('\nTEST 3: Same message ID, different account');
  const msg3Id = crypto.randomUUID();
  const msg3 = await MessageRepository.upsertByMessageId(accountB, conv3, metaId, {
    _id: msg3Id,
    accountId: accountB,
    conversationId: conv3,
    senderType: 'customer',
    contentText: 'Different account',
    status: 'delivered'
  });

  console.log('TEST 3 Result: ' + (msg3._id === msg3Id ? 'PASSED (Allowed)' : 'FAILED'));

  console.log('\nTEST 4: Repository idempotency');
  // Checked in Test 1.
  
  console.log('\nTEST 5: Distinct messages validation');
  const countA = await Message.countDocuments({ accountId: accountA });
  console.log('TEST 5 Result: ' + (countA === 2 ? 'PASSED (2 distinct messages in Account A)' : 'FAILED'));

  console.log('\nTEST 6: Chronological retrieval');
  const msgs = await MessageRepository.findManyWithCursor(accountA, conv1, 10, null);
  console.log('TEST 6 Result: ' + (msgs.length === 1 && msgs[0]._id === msg1Id ? 'PASSED' : 'FAILED'));

  // Test tenant isolation explicitly - try to read B's message from A
  const msgBfromA = await MessageRepository.findById(accountA, msg3Id);
  console.log('TEST Tenant Isolation Result: ' + (msgBfromA === null ? 'PASSED' : 'FAILED'));

  // Cleanup
  await Message.deleteMany({ accountId: { $in: [accountA, accountB] } });
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
