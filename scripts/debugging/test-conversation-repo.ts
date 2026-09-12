import { connectToDatabase } from '../../src/lib/mongodb/client';
import { ConversationRepository } from '../../src/lib/mongodb/repositories/ConversationRepository';
import { Conversation } from '../../src/lib/mongodb/models/Conversation';
import * as crypto from 'crypto';

async function run() {
  await connectToDatabase();
  const acc1 = crypto.randomUUID();
  const acc2 = crypto.randomUUID();
  const contactId = crypto.randomUUID();
  
  await Conversation.deleteMany({ accountId: { $in: [acc1, acc2] } });

  console.log('1. Create Conversation with correct accountId');
  const convId = crypto.randomUUID();
  const conv = await ConversationRepository.create({
    _id: convId,
    accountId: acc1,
    contactId,
    status: 'open'
  });
  console.log('Created:', !!conv);

  console.log('2. Find Conversation by accountId + ID');
  const found = await ConversationRepository.findById(acc1, convId);
  console.log('Found:', !!found);

  console.log('3. Cross-account lookup fails');
  const cross = await ConversationRepository.findById(acc2, convId);
  console.log('Cross account found:', !!cross);

  console.log('4. Cross-account update fails');
  const updated = await ConversationRepository.updateById(acc2, convId, { status: 'closed' });
  console.log('Cross account updated:', !!updated);

  console.log('5. Ownership cannot be changed');
  const hacked = await ConversationRepository.updateById(acc1, convId, { accountId: acc2 } as any);
  console.log('Ownership hacked:', hacked?.accountId === acc2);

  console.log('6. Protected fields check');
  const protectedCheck = await ConversationRepository.updateById(acc1, convId, { _id: 'fake', accountId: acc2 } as any);
  console.log('Protected fields unchanged:', protectedCheck?._id === convId && protectedCheck?.accountId === acc1);

  console.log('7. Migrated uniqueness/race behavior works correctly');
  let raceError = null;
  try {
    await ConversationRepository.create({
      _id: crypto.randomUUID(),
      accountId: acc1,
      contactId,
      status: 'pending'
    });
  } catch (err: any) {
    raceError = err.code;
  }
  console.log('Race error code:', raceError);

  console.log('8. Cleanup');
  await Conversation.deleteMany({ accountId: { $in: [acc1, acc2] } });

  process.exit(0);
}

run().catch(console.error);
