import mongoose from 'mongoose';
import { MessageRepository } from '../../src/lib/mongodb/repositories/MessageRepository';
import { Conversation } from '../../src/lib/mongodb/models/Conversation';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!, { dbName: process.env.MONGODB_DB_NAME! });
  
  const conversation = await Conversation.findOne().sort({ updatedAt: -1 });
  if (!conversation) {
    console.log("No conversations found");
    return process.exit(0);
  }

  const messages = await MessageRepository.findManyWithCursor(conversation.accountId, conversation._id, 15, null);
  
  console.log("CONVERSATION MESSAGES:");
  for (const m of messages.reverse()) {
    console.log(`[${m.senderType}] ${m.contentType}: ${m.contentText}`);
  }
  process.exit(0);
}
run().catch(console.error);
