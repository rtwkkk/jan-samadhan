import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAiConversation } from './conversation-handler';
import { MessageRepository } from '@/lib/mongodb/repositories/MessageRepository';
import { sendMessageToConversation } from '@/lib/whatsapp/send-message';
import * as IntentClassifier from './intent-classifier';
import * as ComplaintFlow from './complaint-registration-flow';
import * as StatusFlow from './complaint-status-flow';
import * as HelpFlow from './other-help-flow';

vi.mock('@/lib/mongodb/repositories/MessageRepository');
vi.mock('@/lib/whatsapp/send-message');
vi.mock('./intent-classifier');
vi.mock('./complaint-registration-flow');
vi.mock('./complaint-status-flow');
vi.mock('./other-help-flow');
vi.mock('./groq-provider');

describe('handleAiConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(MessageRepository.findManyWithCursor).mockResolvedValue([]);
    vi.mocked(IntentClassifier.detectIntent).mockResolvedValue('UNKNOWN');
    vi.mocked(ComplaintFlow.handleComplaintRegistrationFlow).mockResolvedValue('Mock Flow Response');
    vi.mocked(StatusFlow.handleComplaintStatusFlow).mockResolvedValue('Mock Status Response');
    vi.mocked(HelpFlow.handleOtherHelpFlow).mockResolvedValue('Mock Help Response');
  });

  it('A. Main menu deterministic routing: "1" -> REGISTER_COMPLAINT', async () => {
    await handleAiConversation('acc', 'conv', '1', 'phone');
    expect(IntentClassifier.detectIntent).not.toHaveBeenCalled();
    expect(ComplaintFlow.handleComplaintRegistrationFlow).toHaveBeenCalled();
  });

  it('A. Main menu deterministic routing: "2" -> CHECK_STATUS', async () => {
    await handleAiConversation('acc', 'conv', '2', 'phone');
    expect(IntentClassifier.detectIntent).not.toHaveBeenCalled();
    expect(sendMessageToConversation).toHaveBeenCalledWith('acc', expect.objectContaining({
      contentText: 'Mock Status Response'
    }));
  });

  it('A. Main menu deterministic routing: "3" -> OTHER_HELP', async () => {
    await handleAiConversation('acc', 'conv', '3', 'phone');
    expect(IntentClassifier.detectIntent).not.toHaveBeenCalled();
    expect(sendMessageToConversation).toHaveBeenCalledWith('acc', expect.objectContaining({
      contentText: 'Mock Help Response'
    }));
  });

  it('B. Complaint context: "Rahul" continues the complaint flow', async () => {
    vi.mocked(MessageRepository.findManyWithCursor).mockResolvedValueOnce([
      {
        _id: '1', accountId: 'acc', conversationId: 'conv', senderType: 'agent', contentType: 'text',
        contentText: 'Achha 👍 Aapka full name kya hai?', status: 'sent', createdAt: new Date(), updatedAt: new Date()
      } as any
    ]);
    
    vi.mocked(IntentClassifier.detectIntent).mockResolvedValueOnce('UNKNOWN');
    await handleAiConversation('acc', 'conv', 'Rahul', 'phone');
    expect(ComplaintFlow.handleComplaintRegistrationFlow).toHaveBeenCalled();
  });

  it('C. Status context: Sending CMP-123456 continues the status flow', async () => {
    vi.mocked(MessageRepository.findManyWithCursor).mockResolvedValueOnce([
      {
        _id: '1', accountId: 'acc', conversationId: 'conv', senderType: 'agent', contentType: 'text',
        contentText: 'Ji, kripya apna Complaint ID bhejiye', status: 'sent', createdAt: new Date(), updatedAt: new Date()
      } as any
    ]);
    
    vi.mocked(IntentClassifier.detectIntent).mockResolvedValueOnce('UNKNOWN');
    await handleAiConversation('acc', 'conv', 'CMP-123456', 'phone');
    
    expect(StatusFlow.handleComplaintStatusFlow).toHaveBeenCalledWith('acc', 'CMP-123456');
  });

  it('D. Help context: Sending 4, 5, 6, 7, 8 routes strictly without intent classifier', async () => {
    const inputs = ['4', '5', '6', '7', '8'];
    
    for (const input of inputs) {
      vi.clearAllMocks();
      vi.mocked(MessageRepository.findManyWithCursor).mockResolvedValueOnce([
        {
          _id: '1', accountId: 'acc', conversationId: 'conv', senderType: 'agent', contentType: 'text',
          contentText: 'Kripya 4 se 8 mein se koi option choose karein.', status: 'sent', createdAt: new Date(), updatedAt: new Date()
        } as any
      ]);
      
      await handleAiConversation('acc', 'conv', input, 'phone');
      
      // Intent classifier MUST NOT be called!
      expect(IntentClassifier.detectIntent).not.toHaveBeenCalled();
      
      // Must call handleOtherHelpFlow
      expect(HelpFlow.handleOtherHelpFlow).toHaveBeenCalledWith(input, false);
      expect(sendMessageToConversation).toHaveBeenCalledWith('acc', expect.objectContaining({
        contentText: 'Mock Help Response'
      }));
      
      // Must NOT invoke Options 1 or 2
      expect(ComplaintFlow.handleComplaintRegistrationFlow).not.toHaveBeenCalled();
      expect(StatusFlow.handleComplaintStatusFlow).not.toHaveBeenCalled();
    }
  });

  it('D. Help context: invalid input (9) remains inside Other Help', async () => {
    vi.mocked(MessageRepository.findManyWithCursor).mockResolvedValueOnce([
      {
        _id: '1', accountId: 'acc', conversationId: 'conv', senderType: 'agent', contentType: 'text',
        contentText: 'Kripya 4 se 8 mein se koi option choose karein.', status: 'sent', createdAt: new Date(), updatedAt: new Date()
      } as any
    ]);
    
    // Invalid input falls to detectIntent, gets UNKNOWN
    vi.mocked(IntentClassifier.detectIntent).mockResolvedValueOnce('UNKNOWN');
    await handleAiConversation('acc', 'conv', '9', 'phone');
    
    expect(HelpFlow.handleOtherHelpFlow).toHaveBeenCalledWith('9', false);
    expect(sendMessageToConversation).toHaveBeenCalledWith('acc', expect.objectContaining({
      contentText: 'Mock Help Response'
    }));
  });

  it('D. Help context: "hi" returns to the main menu', async () => {
    vi.mocked(MessageRepository.findManyWithCursor).mockResolvedValueOnce([
      {
        _id: '1', accountId: 'acc', conversationId: 'conv', senderType: 'agent', contentType: 'text',
        contentText: 'Kripya 4 se 8 mein se koi option choose karein.', status: 'sent', createdAt: new Date(), updatedAt: new Date()
      } as any
    ]);
    
    // "hi" gets classified as GREETING
    vi.mocked(IntentClassifier.detectIntent).mockResolvedValueOnce('GREETING');
    await handleAiConversation('acc', 'conv', 'hi', 'phone');
    
    // Should NOT call Other Help flow
    expect(HelpFlow.handleOtherHelpFlow).not.toHaveBeenCalled();
    
    expect(sendMessageToConversation).toHaveBeenCalledWith('acc', expect.objectContaining({
      contentText: expect.stringContaining('Citizen Service Portal mein aapka swagat hai')
    }));
  });
});
