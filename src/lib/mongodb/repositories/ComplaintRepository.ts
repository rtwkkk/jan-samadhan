import mongoose, { ClientSession } from "mongoose";
import { Complaint, IComplaint } from '../models/Complaint';
import { stripProtectedFields } from './BaseRepository';
import crypto from 'crypto';

function generateComplaintId(): string {
  return 'CMP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

export class ComplaintRepository {
  static async findById(accountId: string, id: string, session?: ClientSession): Promise<IComplaint | null> {
    return Complaint.findOne({ _id: id, accountId }).session(session || null).lean();
  }

  static async findByComplaintId(accountId: string, complaintId: string, session?: ClientSession): Promise<IComplaint | null> {
    return Complaint.findOne({ accountId, complaintId }).session(session || null).lean();
  }

  
  static async getComplaintStatus(accountId: string, complaintId: string, session?: ClientSession): Promise<Partial<IComplaint> | null> {
    return Complaint.findOne({ accountId, complaintId })
      .select('-_id complaintId status complaintType description district villageCityBlock department priority createdAt updatedAt')
      .session(session || null)
      .lean();
  }

  static async findMany(accountId: string, filters: Record<string, unknown> = {}, limit: number = 50, skip: number = 0, session?: ClientSession): Promise<IComplaint[]> {
    return Complaint.find({ ...filters, accountId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .session(session || null)
      .lean();
  }

  static async count(accountId: string, filter: Record<string, any> = {}): Promise<number> {
    return Complaint.countDocuments({ ...filter, accountId });
  }

  static async create(accountId: string, data: Partial<IComplaint>, session?: ClientSession): Promise<IComplaint> {
    let complaintId = data.complaintId;
    
    // Auto-generate a readable complaintId if not provided. Retry on collision.
    let retries = 3;
    while (!complaintId && retries > 0) {
      const candidate = generateComplaintId();
      const existing = await Complaint.exists({ accountId, complaintId: candidate }).session(session || null);
      if (!existing) {
        complaintId = candidate;
      }
      retries--;
    }
    
    if (!complaintId) {
      throw new Error('Failed to generate a unique complaintId');
    }

    const complaint = await Complaint.create([{...data, _id: data._id || crypto.randomUUID(), accountId, complaintId}], { session });
    return complaint[0];
  }

  static async updateById(accountId: string, id: string, update: Partial<IComplaint>, session?: ClientSession): Promise<IComplaint | null> {
    const safeUpdate = stripProtectedFields(update, ['accountId', '_id', 'complaintId', 'createdAt', 'updatedAt']);
    return Complaint.findOneAndUpdate({ _id: id, accountId }, { $set: safeUpdate }, { new: true, session }).lean();
  }

  static async deleteById(accountId: string, id: string): Promise<boolean> {
    const result = await Complaint.deleteOne({ _id: id, accountId });
    return result.deletedCount === 1;
  }
}
