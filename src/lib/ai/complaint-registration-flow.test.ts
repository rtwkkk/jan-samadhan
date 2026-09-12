import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleComplaintRegistrationFlow } from './complaint-registration-flow';
import { ComplaintRepository } from '@/lib/mongodb/repositories/ComplaintRepository';
import { AIProvider } from './provider';

vi.mock('@/lib/mongodb/repositories/ComplaintRepository');

describe('handleComplaintRegistrationFlow Strict Backend Requirements', () => {
  let mockProvider: AIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = {
      generateReply: vi.fn(),
      generateStructuredData: vi.fn()
    };
  });

  it('1. Missing fields asked one at a time, known fields not re-asked', async () => {
    vi.mocked(mockProvider.generateStructuredData).mockResolvedValueOnce({
      citizenName: 'Rahul', // Only name known
    });

    const response = await handleComplaintRegistrationFlow(mockProvider, 'acc-1', [], '1234567890');
    // Name is known, should ask for complaintType next. If AI didn't provide nextMessage, fallback should hit
    expect(response).toContain('kis cheez ki problem'); 
  });

  it('2. Multiple fields supplied across messages -> still requests next missing field', async () => {
    vi.mocked(mockProvider.generateStructuredData).mockResolvedValueOnce({
      citizenName: 'Rahul',
      complaintType: 'Water',
      district: 'Gumla',
    });

    const response = await handleComplaintRegistrationFlow(mockProvider, 'acc-1', [], '1234567890');
    // Name, type, district known. description is first missing required field
    expect(response).toContain('Problem kya hai');
  });

  it('3. All required fields supplied in one message -> asks for evidence or confirms', async () => {
    vi.mocked(mockProvider.generateStructuredData).mockResolvedValueOnce({
      citizenName: 'Rahul',
      complaintType: 'Water',
      district: 'Gumla',
      villageCityBlock: 'Rampur',
      description: '5 din se paani nahi aa raha'
    });

    const response = await handleComplaintRegistrationFlow(mockProvider, 'acc-1', [], '1234567890');
    // All required known. Evidence is missing.
    expect(response).toContain('photo ya video');
  });

  it('4. Incomplete data can NEVER create a complaint (AI hallucination intercepted)', async () => {
    vi.mocked(mockProvider.generateStructuredData).mockResolvedValueOnce({
      citizenName: 'Rahul',
      // Missing description, district, etc.
      isConfirmed: true, // AI hallucinated confirmation
    });

    const response = await handleComplaintRegistrationFlow(mockProvider, 'acc-1', [], '1234567890');
    
    // Should NOT have created the complaint
    expect(ComplaintRepository.create).not.toHaveBeenCalled();
    // Should reset confirmation and ask for next missing field (complaintType)
    expect(response).toContain('kis cheez ki problem');
  });

  it('5. Phone comes strictly from WhatsApp context', async () => {
    vi.mocked(mockProvider.generateStructuredData).mockResolvedValueOnce({
      citizenName: 'Rahul',
      complaintType: 'Water',
      district: 'Gumla',
      villageCityBlock: 'Rampur',
      description: '5 din se paani nahi aa raha',
      evidenceAvailable: false,
      isConfirmed: true,
      phone: '9999999999' // AI hallucinates different phone
    });

    vi.mocked(ComplaintRepository.create).mockResolvedValueOnce({
      complaintId: 'COMP-123'
    } as any);

    await handleComplaintRegistrationFlow(mockProvider, 'acc-1', [], '1234567890');
    
    // Must use context phone, not AI phone
    expect(ComplaintRepository.create).toHaveBeenCalledWith('acc-1', expect.objectContaining({
      phone: '1234567890',
    }));
  });

  it('6. Confirmation required before creation', async () => {
    vi.mocked(mockProvider.generateStructuredData).mockResolvedValueOnce({
      citizenName: 'Rahul',
      complaintType: 'Water',
      district: 'Gumla',
      villageCityBlock: 'Rampur',
      description: '5 din se paani nahi aa raha',
      evidenceAvailable: true,
      isConfirmed: false, // Not yet confirmed
    });

    const response = await handleComplaintRegistrationFlow(mockProvider, 'acc-1', [], '1234567890');
    expect(response).toContain('Sab sahi hai');
    expect(ComplaintRepository.create).not.toHaveBeenCalled();
  });

  it('7. Explicit confirmation creates the complaint successfully', async () => {
    vi.mocked(mockProvider.generateStructuredData).mockResolvedValueOnce({
      citizenName: 'Rahul',
      complaintType: 'Water',
      district: 'Gumla',
      villageCityBlock: 'Rampur',
      description: '5 din se paani nahi aa raha',
      evidenceAvailable: true,
      isConfirmed: true, // Explicitly confirmed
    });

    vi.mocked(ComplaintRepository.create).mockResolvedValueOnce({
      complaintId: 'COMP-123'
    } as any);

    const response = await handleComplaintRegistrationFlow(mockProvider, 'acc-1', [], '1234567890');
    expect(response).toContain('successfully register ho gayi');
    expect(ComplaintRepository.create).toHaveBeenCalled();
  });

  it('8. Cancellation creates nothing', async () => {
    vi.mocked(mockProvider.generateStructuredData).mockResolvedValueOnce({
      isCanceled: true
    });

    const response = await handleComplaintRegistrationFlow(mockProvider, 'acc-1', [], '1234567890');
    expect(response).toContain('Complaint cancel ho gayi');
    expect(ComplaintRepository.create).not.toHaveBeenCalled();
  });

  it('9. Malformed/failed AI extraction does not create a complaint', async () => {
    vi.mocked(mockProvider.generateStructuredData).mockResolvedValueOnce(null); // Network error / malformed

    const response = await handleComplaintRegistrationFlow(mockProvider, 'acc-1', [], '1234567890');
    expect(response).toContain('Sorry ji, abhi thodi technical problem aa rahi hai');
    expect(ComplaintRepository.create).not.toHaveBeenCalled();
  });
});
