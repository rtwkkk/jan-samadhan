import { connectToDatabase } from '../../src/lib/mongodb/client';
import { ContactRepository } from '../../src/lib/mongodb/repositories/ContactRepository';
import { Contact } from '../../src/lib/mongodb/models/Contact';

async function run() {
  await connectToDatabase();
  const crypto = require('crypto');
  const acc1 = crypto.randomUUID();
  const acc2 = crypto.randomUUID();
  const phone = '1234567890';
  
  // Cleanup from prev runs
  await Contact.deleteMany({ accountId: { $in: [acc1, acc2] } });

  console.log('1. Testing missing contact creation...');
  const newContact = await ContactRepository.create({
    _id: crypto.randomUUID(),
    accountId: acc1,
    phone,
    name: 'John'
  });
  console.log('Created:', newContact.phone);

  console.log('2. Testing existing contact found...');
  const existing = await Contact.findOne({ accountId: acc1, phone: newContact.phone });
  if (existing) {
    console.log('Found:', existing.name);
  }

  console.log('3. Testing concurrent creation race...');
  const p1 = ContactRepository.create({
    _id: crypto.randomUUID(),
    accountId: acc2,
    phone: '0987654321',
    name: 'Alice'
  }).catch(e => e.code);

  const p2 = ContactRepository.create({
    _id: crypto.randomUUID(),
    accountId: acc2,
    phone: '0987654321',
    name: 'Alice2'
  }).catch(e => e.code);

  const results = await Promise.all([p1, p2]);
  console.log('Concurrent results:', results.map(r => typeof r === 'number' ? 'Error ' + r : 'Success'));
  
  const acc2Contacts = await Contact.find({ accountId: acc2 });
  console.log('Total contacts in acc2:', acc2Contacts.length);

  console.log('4. Testing cross-account lookup...');
  const cross = await Contact.findOne({ accountId: acc2, phone });
  console.log('Cross account found?', !!cross);

  console.log('5. Contact ID returned is string?', typeof newContact._id === 'string');

  console.log('6. Update profile name behavior...');
  await ContactRepository.updateById(acc1, newContact._id, { name: 'John Updated' });
  const updated = await Contact.findOne({ _id: newContact._id });
  console.log('Updated name:', updated?.name);

  process.exit(0);
}

run().catch(console.error);
