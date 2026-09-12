import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomFieldDefinition extends Document<string> {
  _id: string;
  accountId: string;
  userId?: string;
  fieldName: string;
  fieldType: string;
  fieldOptions?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CustomFieldDefinitionSchema = new Schema<ICustomFieldDefinition>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  userId: { type: String },
  fieldName: { type: String, required: true },
  fieldType: { type: String, required: true, default: 'text' },
  fieldOptions: { type: Schema.Types.Mixed },
}, { timestamps: true, _id: false });

CustomFieldDefinitionSchema.index({ accountId: 1, fieldName: 1 }, { unique: true });

export const CustomFieldDefinition: Model<ICustomFieldDefinition> =
  mongoose.models.CustomFieldDefinition ||
  mongoose.model<ICustomFieldDefinition>('CustomFieldDefinition', CustomFieldDefinitionSchema);
