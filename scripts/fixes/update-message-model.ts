import * as fs from 'fs';

const messageFile = 'src/lib/mongodb/models/Message.ts';
let msgContent = fs.readFileSync(messageFile, 'utf8');

msgContent = msgContent.replace(
  "MessageSchema.index({ messageId: 1 }, { unique: true, sparse: true });",
  "MessageSchema.index({ conversationId: 1, messageId: 1 }, { unique: true, sparse: true });"
);
fs.writeFileSync(messageFile, msgContent);

const repoFile = 'src/lib/mongodb/repositories/MessageRepository.ts';
let repoContent = fs.readFileSync(repoFile, 'utf8');

repoContent = repoContent.replace(
  /static async upsertByMessageId\(accountId: string, messageId: string, data: Partial<IMessage>\): Promise<IMessage> \{[\s\S]*?return doc as IMessage;\n  \}/,
  `static async upsertByMessageId(accountId: string, conversationId: string, messageId: string, data: Partial<IMessage>): Promise<IMessage> {
    const safeData = stripProtectedFields(data);
    const setOnInsert = { accountId, conversationId, messageId, _id: data._id };

    const doc = await Message.findOneAndUpdate(
      { accountId, conversationId, messageId },
      { $set: safeData, $setOnInsert: setOnInsert },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );
    return doc as IMessage;
  }`
);

repoContent = repoContent.replace(
  "{ new: true }",
  "{ returnDocument: 'after' }"
);

fs.writeFileSync(repoFile, repoContent);
