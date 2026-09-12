import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPipelineStage {
  /** Stage UUID — stored as `id` on embedded subdocument (schema has _id:false). */
  id: string;
  name: string;
  position: number;
  color: string;
}

export interface IPipeline extends Document<string> {
  _id: string;
  accountId: string;
  name: string;
  stages: IPipelineStage[];
  createdAt: Date;
  updatedAt: Date;
}

const PipelineStageSchema = new Schema<IPipelineStage>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  position: { type: Number, default: 0 },
  color: { type: String, default: '#3b82f6' }
}, { _id: false });

const PipelineSchema = new Schema<IPipeline>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  name: { type: String, required: true },
  stages: [PipelineStageSchema]
}, { timestamps: true, _id: false });

export const Pipeline: Model<IPipeline> = mongoose.models.Pipeline || mongoose.model<IPipeline>('Pipeline', PipelineSchema);
