import { connectToDatabase } from '../../src/lib/mongodb/client';
import { WhatsappConfig } from '../../src/lib/mongodb/models/WhatsappConfig';
import { Conversation } from '../../src/lib/mongodb/models/Conversation';
import { Contact } from '../../src/lib/mongodb/models/Contact';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await connectToDatabase();
  const configs = await WhatsappConfig.find({}).lean();
  console.log("WhatsappConfigs:", configs.map(c => ({
    id: c._id, accountId: c.accountId, phoneId: c.phoneNumberId, wabaId: c.wabaId
  })));
  
  const convs = await Conversation.find({}).lean();
  console.log("Conversations:", convs.map(c => ({
    id: c._id, contactId: c.contactId
  })));

  const contacts = await Contact.find({}).lean();
  console.log("Contacts:", contacts.map(c => ({
    id: c._id, phone: c.phone
  })));
  process.exit(0);
}
run();
