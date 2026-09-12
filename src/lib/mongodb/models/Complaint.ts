import mongoose, { Schema, Document, Model } from 'mongoose';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface IComplaint extends Document<string> {
  _id: string;
  accountId: string;
  complaintId: string;
  citizenName: string;
  phone: string;
  email?: string;
  complaintType: string;
  description: string;
  district: string;
  villageCityBlock: string;
  location?: string;
  peopleAffected?: number;
  priority: ComplaintPriority;
  evidence?: string[];
  status: ComplaintStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  complaintId: { type: String, required: true },
  citizenName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  complaintType: { type: String, required: true },
  description: { type: String, required: true },
  district: { type: String, required: true },
  villageCityBlock: { type: String, required: true },
  location: { type: String },
  peopleAffected: { type: Number },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium',
    required: true
  },
  evidence: [{ type: String }],
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'resolved', 'closed'], 
    default: 'open',
    required: true
  }
}, { timestamps: true, _id: false });

ComplaintSchema.index({ accountId: 1, complaintId: 1 }, { unique: true });
ComplaintSchema.index({ accountId: 1, createdAt: -1 });
ComplaintSchema.index({ accountId: 1, status: 1 });
ComplaintSchema.index({ accountId: 1, phone: 1 });

export const Complaint: Model<IComplaint> = mongoose.models.Complaint || mongoose.model<IComplaint>('Complaint', ComplaintSchema);
