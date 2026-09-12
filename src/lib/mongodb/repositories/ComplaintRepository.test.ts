import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplaintRepository } from './ComplaintRepository';
import { Complaint } from '../models/Complaint';

const lean = vi.fn();
const session = vi.fn().mockReturnValue({ lean });
const limit = vi.fn().mockReturnValue({ session, lean });
const skip = vi.fn().mockReturnValue({ limit });
const sort = vi.fn().mockReturnValue({ skip });

vi.mock('../models/Complaint', () => ({
  Complaint: {
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    exists: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
    create: vi.fn(),
  }
}));

describe('ComplaintRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Complaint.findOne).mockReturnValue({ session, lean } as any);
    vi.mocked(Complaint.find).mockReturnValue({ sort } as any);
    vi.mocked(Complaint.findOneAndUpdate).mockReturnValue({ session, lean } as any);
  });

  it('findById calls fineOne with _id and accountId', async () => {
    lean.mockResolvedValueOnce({ _id: '123', complaintId: 'CMP-123' });
    const res = await ComplaintRepository.findById('acc-1', '123');
    expect(Complaint.findOne).toHaveBeenCalledWith({ _id: '123', accountId: 'acc-1' });
    expect(res?._id).toBe('123');
  });

  it('create generates unique complaintId and saves', async () => {
    vi.mocked(Complaint.exists).mockReturnValue({ session: vi.fn().mockResolvedValue(false) } as any);
    vi.mocked(Complaint.create).mockResolvedValue([{ _id: 'new-id', complaintId: 'CMP-XXX' }] as any);
    
    const res = await ComplaintRepository.create('acc-1', { citizenName: 'John', phone: '123' });
    
    expect(Complaint.exists).toHaveBeenCalled();
    expect(Complaint.create).toHaveBeenCalled();
    expect(res._id).toBe('new-id');
  });

  it('updateById calls findOneAndUpdate without protected fields', async () => {
    lean.mockResolvedValueOnce({ status: 'in_progress' });
    await ComplaintRepository.updateById('acc-1', 'id1', { status: 'in_progress', accountId: 'hacked' });
    
    expect(Complaint.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'id1', accountId: 'acc-1' },
      { $set: { status: 'in_progress' } }, // accountId stripped
      expect.any(Object)
    );
  });
  describe('getComplaintStatus (Option 2)', () => {
    it('returns requested fields for an existing complaint', async () => {
      const select = vi.fn().mockReturnValue({ session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ complaintId: 'CMP-123', status: 'open' }) }) });
      vi.mocked(Complaint.findOne).mockReturnValue({ select } as any);
      
      const res = await ComplaintRepository.getComplaintStatus('acc-1', 'CMP-123');
      
      expect(Complaint.findOne).toHaveBeenCalledWith({ accountId: 'acc-1', complaintId: 'CMP-123' });
      expect(select).toHaveBeenCalledWith('-_id complaintId status complaintType description district villageCityBlock department priority createdAt updatedAt');
      expect(res).toEqual({ complaintId: 'CMP-123', status: 'open' });
    });

    it('returns null for nonexistent complaint', async () => {
      const select = vi.fn().mockReturnValue({ session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) });
      vi.mocked(Complaint.findOne).mockReturnValue({ select } as any);
      
      const res = await ComplaintRepository.getComplaintStatus('acc-1', 'CMP-999');
      
      expect(res).toBeNull();
    });

    it('cross-account complaint cannot be accessed (enforces accountId isolation)', async () => {
      const select = vi.fn().mockReturnValue({ session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) });
      vi.mocked(Complaint.findOne).mockReturnValue({ select } as any);
      
      const res = await ComplaintRepository.getComplaintStatus('hacked-acc', 'CMP-123');
      
      // Query should strictly contain the caller's accountId
      expect(Complaint.findOne).toHaveBeenCalledWith({ accountId: 'hacked-acc', complaintId: 'CMP-123' });
      expect(res).toBeNull();
    });
  });
});
