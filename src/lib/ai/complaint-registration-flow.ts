import { AIProvider, ChatMessage } from './provider';
import { ComplaintRepository } from '@/lib/mongodb/repositories/ComplaintRepository';

export type ComplaintDraft = {
  citizenName?: string;
  phone?: string;
  complaintType?: string;
  description?: string;
  district?: string;
  villageCityBlock?: string;
  email?: string;
  location?: string;
  peopleAffected?: number;
  evidence?: string[];
  isConfirmed?: boolean;
  isCanceled?: boolean;
  evidenceAvailable?: boolean;
  nextMessageToCitizen?: string;
};

export async function handleComplaintRegistrationFlow(
  provider: AIProvider,
  accountId: string,
  history: ChatMessage[],
  senderPhone: string
): Promise<string> {
  const extractionPrompt: ChatMessage = {
    role: 'system',
    content: `You are a helpful WhatsApp assistant for citizens in India.
Your job is to read the conversation, extract the complaint details, and formulate the NEXT natural response to the citizen.

Rules for conversation (nextMessageToCitizen):
1. CITIZEN-FRIENDLY LANGUAGE: Use simple everyday Hindi/Hinglish (e.g., "Achha, samajh gaya", "Aapko kis cheez ki problem hai?", "Ye problem kis district mein hai?").
2. ONE QUESTION AT A TIME: Never dump multiple questions. Determine ONE missing required field and ask for it.
3. VAGUE INPUT & MULTIPLE ISSUES: If input is vague ("road kharab hai"), ask ONE clarifying question. If they mention multiple issues, ask which one to register first.
4. CONFIRMATION: When ALL required fields (citizenName, complaintType, description, district, villageCityBlock) AND evidence availability are known, write a short conversational summary and ask for explicit confirmation. 

Rules for extraction:
- Infer 'department' (e.g., Water Supply, Electricity, Roads/Public Works, Municipal/Sanitation) based on their own words.
- Infer 'priority' (low, medium, high, urgent) from duration/severity.
- If they explicitly confirm the summary (e.g., "haan", "yes", "sahi hai", "kar do", "ji haan"), set "isConfirmed": true.
- If they cancel or correct during confirmation (e.g., "nahi", "galat hai", "change karna hai"), set "isConfirmed": false.

Output valid JSON ONLY. Only include fields that were provided or confidently inferred.

JSON Schema:
{
  "citizenName": "string",
  "complaintType": "string",
  "description": "string",
  "district": "string",
  "villageCityBlock": "string",
  "location": "string",
  "peopleAffected": 50,
  "evidenceAvailable": false,
  "isConfirmed": false,
  "isCanceled": false,
  "department": "string",
  "priority": "string",
  "nextMessageToCitizen": "string (your natural Hinglish response)"
}`
  };

  const draft = await provider.generateStructuredData<ComplaintDraft>([...history, extractionPrompt]);
  
  if (!draft) {
    return "Sorry ji, abhi thodi technical problem aa rahi hai. Ek baar phir se bataiye.";
  }

  // Inject known phone number
  draft.phone = senderPhone;

  if (draft.isCanceled) {
    return "Complaint cancel ho gayi hai. Nayi complaint ke liye '1' bhejein.";
  }

  // Check REQUIRED fields (strict backend validation)
  const missingRequiredFields: string[] = [];
  if (!draft.citizenName?.trim()) missingRequiredFields.push('name');
  if (!draft.complaintType?.trim()) missingRequiredFields.push('complaintType');
  if (!draft.description?.trim()) missingRequiredFields.push('description');
  if (!draft.district?.trim()) missingRequiredFields.push('district');
  if (!draft.villageCityBlock?.trim()) missingRequiredFields.push('villageCityBlock');

  // Authoritative check: AI can never confirm if required fields are missing
  if (draft.isConfirmed && missingRequiredFields.length > 0) {
    draft.isConfirmed = false;
    draft.nextMessageToCitizen = undefined; // Strip AI response to enforce deterministic fallback
  }

  if (!draft.isConfirmed) {
    if (missingRequiredFields.length > 0) {
      const nextField = missingRequiredFields[0];
      const fieldQuestions: Record<string, string> = {
        'name': "Achha 👍 Aapka full name kya hai?",
        'complaintType': "Aapko kis cheez ki problem hai? Jaise paani, bijli, sadak, safai etc.",
        'description': "Theek hai 👍 Problem kya hai, thoda bataiye.",
        'district': "Ye problem kis district mein hai?",
        'villageCityBlock': "Aapke gaon, city ya block ka naam kya hai?"
      };
      
      return draft.nextMessageToCitizen || fieldQuestions[nextField];
    }
    
    // If all required fields are present, but not confirmed:
    // AI might ask for optional evidence, or summarize for confirmation.
    if (draft.evidenceAvailable === undefined) {
      return draft.nextMessageToCitizen || "Aapke paas iski koi photo ya video hai?";
    }

    // Deterministic Summary Fallback
    let summary = "Achha ji, complaint register karne se pehle ek baar details check kar lete hain:\n\n";
    summary += `Name: ${draft.citizenName}\n`;
    summary += `Type: ${draft.complaintType}\n`;
    summary += `Description: ${draft.description}\n`;
    summary += `District: ${draft.district}\n`;
    summary += `Village/City: ${draft.villageCityBlock}\n`;
    summary += "\nSab sahi hai? Haan/Yes ya Nahi/No bataiye.";
    
    return draft.nextMessageToCitizen || summary;
  }

  // 5. Final Submission (Confirmed)
  try {
    const validatedData = {
      citizenName: draft.citizenName!,
      phone: draft.phone!,
      complaintType: draft.complaintType!,
      description: draft.description!,
      district: draft.district!,
      villageCityBlock: draft.villageCityBlock!,
      email: draft.email,
      location: draft.location,
      peopleAffected: typeof draft.peopleAffected === 'number' && draft.peopleAffected >= 0 ? draft.peopleAffected : undefined,
      department: (draft as any).department,
      priority: ((draft as any).priority || 'medium') as any,
      status: 'open' as any
    };

    const complaint = await ComplaintRepository.create(accountId, validatedData);
    
    return `✅ Aapki complaint successfully register ho gayi hai.\n\nComplaint ID: ${complaint.complaintId}\n\nStatus check karne ke liye ye ID yaad rakhein.`;
  } catch (err) {
    console.error('[AI Handler] DB Error creating complaint:', err);
    return "Maaf karna, complaint save karte waqt error aagaya. Thodi der mein try karein.";
  }
}
