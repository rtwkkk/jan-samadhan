import mongoose from 'mongoose';
import { connectToDatabase } from '../../src/lib/mongodb/client';
import { Contact } from '../../src/lib/mongodb/models/Contact';
import { Conversation } from '../../src/lib/mongodb/models/Conversation';
import { Message } from '../../src/lib/mongodb/models/Message';
import { WebhookRepository } from '../../src/lib/mongodb/repositories/WebhookRepository';

const accountId = 'test-account-tx';
const configOwnerUserId = 'test-owner';

async function cleanup() {
  await Contact.deleteMany({ accountId });
  await Conversation.deleteMany({ accountId });
  await Message.deleteMany({ accountId });
  await Contact.deleteMany({ accountId: 'other-account' });
  await Conversation.deleteMany({ accountId: 'other-account' });
  await Message.deleteMany({ accountId: 'other-account' });
}

async function runTests() {
  await connectToDatabase();
  await cleanup();

  console.log('Running TEST 1: New inbound WhatsApp message');
  const msg1 = { contentType: 'text', contentText: 'Hello TX', createdAt: new Date() };
  const res1 = await WebhookRepository.processInboundWebhook(
    accountId, '1234567890', 'Test User', 'msg-1', msg1, configOwnerUserId
  );
  
  if (!res1.contactWasCreated || !res1.conversationWasCreated || !res1.messageWasCreated) {
    throw new Error('TEST 1 FAILED: Expected all to be created');
  }
  let conv1 = await Conversation.findOne({ _id: res1.conversation._id });
  if (conv1?.unreadCount !== 1 || conv1?.lastMessageText !== 'Hello TX') {
    throw new Error('TEST 1 FAILED: Metadata not updated correctly');
  }
  console.log('TEST 1 PASSED');

  console.log('Running TEST 2: Same webhook/message delivered twice');
  const res2 = await WebhookRepository.processInboundWebhook(
    accountId, '1234567890', 'Test User', 'msg-1', msg1, configOwnerUserId
  );
  if (res2.messageWasCreated || res2.contactWasCreated || res2.conversationWasCreated) {
    console.log("DEBUG res2:", { msg: res2.messageWasCreated, con: res2.contactWasCreated, conv: res2.conversationWasCreated }); throw new Error('TEST 2 FAILED: Expected duplicate to be ignored');
  }
  conv1 = await Conversation.findOne({ _id: res1.conversation._id });
  if (conv1?.unreadCount !== 1) {
    throw new Error('TEST 2 FAILED: Unread count incremented on duplicate');
  }
  console.log('TEST 2 PASSED');

  console.log('Running TEST 3: Concurrent deliveries for same message');
  const msg3 = { contentType: 'text', contentText: 'Concurrent', createdAt: new Date() };
  const res3aPromise = WebhookRepository.processInboundWebhook(
    accountId, '1234567890', 'Test User', 'msg-3', msg3, configOwnerUserId
  );
  const res3bPromise = WebhookRepository.processInboundWebhook(
    accountId, '1234567890', 'Test User', 'msg-3', msg3, configOwnerUserId
  );
  const [res3a, res3b] = await Promise.all([res3aPromise, res3bPromise]);
  // One should succeed, one should short-circuit
  if (res3a.messageWasCreated === res3b.messageWasCreated) {
    throw new Error('TEST 3 FAILED: Both returned same created status for message');
  }
  conv1 = await Conversation.findOne({ _id: res1.conversation._id });
  if (conv1?.unreadCount !== 2) {
    throw new Error(`TEST 3 FAILED: Expected unread count 2, got ${conv1?.unreadCount}`);
  }
  console.log('TEST 3 PASSED');

  console.log('Running TEST 4: Same Meta messageId in different conversations');
  const res4 = await WebhookRepository.processInboundWebhook(
    accountId, '0987654321', 'Other User', 'msg-3', msg3, configOwnerUserId
  );
  if (!res4.messageWasCreated) {
    throw new Error('TEST 4 FAILED: Expected message to be created in new conversation');
  }
  console.log('TEST 4 PASSED');

  console.log('Running TEST 5: Different account');
  const res5 = await WebhookRepository.processInboundWebhook(
    'other-account', '1234567890', 'Test User', 'msg-3', msg3, configOwnerUserId
  );
  if (!res5.messageWasCreated) {
    throw new Error('TEST 5 FAILED: Expected tenant isolation to allow duplicate messageId across accounts');
  }
  console.log('TEST 5 PASSED');

  console.log('Running TEST 6: Transaction rollback');
  // Hack to force rollback: pass a message with invalid data if possible, or just mock it.
  // We can just rely on the fact that Mongoose transaction rollback works by doing a deliberate error inside a manual test.
  // For the script, we'll just mock an error inside the repository temporarily.
  let threw = false;
  try {
    const originalFind = Contact.findOne;
    Contact.findOne = () => { throw new Error('Simulated crash after startTransaction') };
    await WebhookRepository.processInboundWebhook(
      accountId, 'fail-phone', 'Fail', 'msg-fail', msg1, configOwnerUserId
    );
  } catch (e) {
    threw = true;
  }
  
  if (!threw) {
    throw new Error('TEST 6 FAILED: Did not throw');
  }
  const failContact = await Contact.findOne({ accountId, phone: 'fail-phone' });
  if (failContact) {
    throw new Error('TEST 6 FAILED: Rollback did not work, contact persisted');
  }
  console.log('TEST 6 PASSED');

  await cleanup();
  await Contact.deleteMany({ accountId: 'other-account' });
  await Conversation.deleteMany({ accountId: 'other-account' });
  await Message.deleteMany({ accountId: 'other-account' });
  
  console.log('All tests passed.');
  process.exit(0);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
