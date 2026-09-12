import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleComplaintStatusFlow } from './complaint-status-flow';
import { ComplaintRepository } from '@/lib/mongodb/repositories/ComplaintRepository';

vi.mock('@/lib/mongodb/repositories/ComplaintRepository', () => ({
  ComplaintRepository: {
    getComplaintStatus: vi.fn()
  }
}));

describe('handleComplaintStatusFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prompts for Complaint ID if not provided (e.g., user just typed "2")', async () => {
    const result = await handleComplaintStatusFlow('acc-1', '2');
    expect(result).toContain('Ji, kripya apna Complaint ID bhejiye');
    expect(ComplaintRepository.getComplaintStatus).not.toHaveBeenCalled();
  });

  it('handles invalid format safely', async () => {
    const result = await handleComplaintStatusFlow('acc-1', 'I want to check status');
    expect(result).toContain('Ji, kripya apna Complaint ID bhejiye');
    expect(ComplaintRepository.getComplaintStatus).not.toHaveBeenCalled();
  });

  it('returns polite not-found message if complaint does not exist', async () => {
    vi.mocked(ComplaintRepository.getComplaintStatus).mockResolvedValue(null);

    const result = await handleComplaintStatusFlow('acc-1', 'mera status batao CMP-123456');
    
    expect(ComplaintRepository.getComplaintStatus).toHaveBeenCalledWith('acc-1', 'CMP-123456');
    expect(result).toContain('is Complaint ID se koi complaint nahi mili');
  });

  it('returns formatted status for existing complaint', async () => {
    vi.mocked(ComplaintRepository.getComplaintStatus).mockResolvedValue({
      complaintId: 'CMP-999999',
      status: 'in_progress',
      complaintType: 'Water Issue',
      description: 'No water for 2 days',
      district: 'Patna',
      villageCityBlock: 'Ward 5',
      department: 'PHED',
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any);

    const result = await handleComplaintStatusFlow('acc-1', 'CMP-999999 please check');
    
    expect(ComplaintRepository.getComplaintStatus).toHaveBeenCalledWith('acc-1', 'CMP-999999');
    expect(result).toContain('*Complaint ID:* CMP-999999');
    expect(result).toContain('*Status:* In Progress');
    expect(result).toContain('*Type:* Water Issue');
    expect(result).toContain('*Description:* No water for 2 days');
    expect(result).toContain('*District:* Patna');
    expect(result).toContain('*Village/Block:* Ward 5');
    expect(result).toContain('*Department:* PHED');
    expect(result).toContain('*Priority:* High');
    expect(result).toContain('doosra Complaint ID bhejein');
  });

  it('handles missing optional fields gracefully', async () => {
    vi.mocked(ComplaintRepository.getComplaintStatus).mockResolvedValue({
      complaintId: 'CMP-777777',
      status: 'resolved',
      complaintType: 'Electric Issue',
      description: 'Wire broke',
      district: 'Gaya',
      villageCityBlock: 'Main Road',
      // No department, No priority
      createdAt: new Date(),
      updatedAt: new Date()
    } as any);

    const result = await handleComplaintStatusFlow('acc-1', 'CMP-777777');
    
    expect(result).toContain('*Status:* Resolved');
    expect(result).not.toContain('*Department:*');
    expect(result).not.toContain('*Priority:*');
  });
});
