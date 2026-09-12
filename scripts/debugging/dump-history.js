require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const { Message } = require('./src/lib/mongodb/models/Message');
const { Conversation } = require('./src/lib/mongodb/models/Conversation');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  
  const conversation = await Conversation.findOne().sort({ updatedAt: -1 });
  if (!conversation) {
    console.log("No conversations found");
    return process.exit(0);
  }

  const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
  
  console.log("CONVERSATION MESSAGES:");
  for (const m of messages) {
    console.log(`[${m.senderType}] ${m.contentType}: ${m.contentText}`);
  }
  process.exit(0);
}
run().catch(console.error);
