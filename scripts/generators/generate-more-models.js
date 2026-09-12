const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'lib', 'mongodb', 'models');

const models = {
  'Automation.ts': `import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAutomation extends Document {
  _id: string;
  accountId: string;
  name: string;
  trigger: any;
  actions: any[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AutomationSchema = new Schema<IAutomation>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  name: { type: String, required: true },
  trigger: { type: Schema.Types.Mixed, required: true },
  actions: [{ type: Schema.Types.Mixed }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true, _id: false });

AutomationSchema.index({ accountId: 1 });

export const Automation: Model<IAutomation> = mongoose.models.Automation || mongoose.model<IAutomation>('Automation', AutomationSchema);
`,
  'AutomationLog.ts': `import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAutomationLog extends Document {
  _id: string;
  accountId: string;
  automationId: string;
  status: 'success' | 'failed';
  details?: any;
  createdAt: Date;
  updatedAt: Date;
}

const AutomationLogSchema = new Schema<IAutomationLog>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  automationId: { type: String, required: true, ref: 'Automation' },
  status: { type: String, enum: ['success', 'failed'], required: true },
  details: { type: Schema.Types.Mixed }
}, { timestamps: true, _id: false });

AutomationLogSchema.index({ accountId: 1, automationId: 1, createdAt: -1 });

export const AutomationLog: Model<IAutomationLog> = mongoose.models.AutomationLog || mongoose.model<IAutomationLog>('AutomationLog', AutomationLogSchema);
`,
  'AiKnowledgeChunk.ts': `import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAiKnowledgeChunk extends Document {
  _id: string;
  accountId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

const AiKnowledgeChunkSchema = new Schema<IAiKnowledgeChunk>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  documentId: { type: String, required: true }, // ref to AiKnowledgeDoc
  chunkIndex: { type: Number, default: 0 },
  content: { type: String, required: true },
  embedding: [{ type: Number }]
}, { timestamps: true, _id: false });

AiKnowledgeChunkSchema.index({ accountId: 1, documentId: 1 });
// Vector index would be defined in Atlas, not here, but we can document it.

export const AiKnowledgeChunk: Model<IAiKnowledgeChunk> = mongoose.models.AiKnowledgeChunk || mongoose.model<IAiKnowledgeChunk>('AiKnowledgeChunk', AiKnowledgeChunkSchema);
`
};

for (const [filename, content] of Object.entries(models)) {
  fs.writeFileSync(path.join(modelsDir, filename), content);
}
console.log('More models generated.');
