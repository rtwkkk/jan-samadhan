const fs = require('fs');
const file = 'src/lib/ai/complaint-registration-flow.ts';
let code = fs.readFileSync(file, 'utf8');

const oldPrompt = `JSON Schema (omit fields if not yet provided by user):
{
  "citizenName": "string or omit",
  "complaintType": "string or omit",
  "description": "string or omit",
  "district": "string or omit",
  "villageCityBlock": "string or omit",
  "email": "string or omit",
  "location": "string or omit",
  "peopleAffected": 0,
  "isConfirmed": false,
  "isCanceled": false
}`;

const newPrompt = `Output valid JSON ONLY. Only include fields that were provided or confidently inferred.

JSON Schema:
{
  "citizenName": "string (e.g. Rahul Kumar)",
  "complaintType": "string (e.g. Water Supply, Electricity)",
  "description": "string",
  "district": "string",
  "villageCityBlock": "string",
  "location": "string (exact location if provided)",
  "peopleAffected": 50,
  "evidenceAvailable": false,
  "isConfirmed": false,
  "isCanceled": false,
  "department": "string (infer from complaint: Water Supply, Roads/Public Works, Electricity, Municipal/Sanitation)",
  "priority": "string (infer: low, medium, high, urgent)"
}`;

code = code.replace(oldPrompt, newPrompt);

// Now update missingFields check to include evidence check
const missingFieldsCode = `  const missingFields: string[] = [];
  if (!draft.citizenName?.trim()) missingFields.push('name');
  if (!draft.complaintType?.trim()) missingFields.push('complaint type (e.g., water, electricity, roads)');
  if (!draft.description?.trim()) missingFields.push('detailed description of the issue');
  if (!draft.district?.trim()) missingFields.push('district');
  if (!draft.villageCityBlock?.trim()) missingFields.push('village, city, or block');`;

const newMissingFieldsCode = `  const missingFields: string[] = [];
  if (!draft.citizenName?.trim()) missingFields.push('name');
  if (!draft.complaintType?.trim()) missingFields.push('complaint type (e.g., water, electricity, roads)');
  if (!draft.description?.trim()) missingFields.push('detailed description of the issue');
  if (!draft.district?.trim()) missingFields.push('district');
  if (!draft.villageCityBlock?.trim()) missingFields.push('village, city, or block');
  if (draft.evidenceAvailable === undefined) missingFields.push('evidence');`;

code = code.replace(missingFieldsCode, newMissingFieldsCode);

const fieldQuestionsCode = `      'name': "Achha 👍 Aapka full name kya hai?",
      'complaint type (e.g., water, electricity, roads)': "Aapko kis cheez ki problem hai? Jaise paani, bijli, sadak, safai etc.",
      'detailed description of the issue': "Theek hai. Problem kya hai, thoda detail mein bataiye.",
      'district': "Ye problem kis district mein hai?",
      'village, city, or block': "Aapka gaon, city ya block ka naam kya hai?"`;

const newFieldQuestionsCode = `      'name': "Achha 👍 Aapka full name kya hai?",
      'complaint type (e.g., water, electricity, roads)': "Aapko kis cheez ki problem hai? Jaise paani, bijli, sadak, safai etc.",
      'detailed description of the issue': "Theek hai 👍 Problem kya hai, thoda bataiye.",
      'district': "Ye problem kis district mein hai?",
      'village, city, or block': "Aapke gaon, city ya block ka naam kya hai?",
      'evidence': "Aapke paas iski koi photo ya video hai?"`;

code = code.replace(fieldQuestionsCode, newFieldQuestionsCode);

const summaryCode = `    if (draft.location) summary += \`Location: \${draft.location}\\n\`;
    if (draft.peopleAffected) summary += \`People Affected: \${draft.peopleAffected}\\n\`;
    summary += "\\nKya ye sahi hai? (Haan / Nahi bhejein)";`;

const newSummaryCode = `    if (draft.location) summary += \`Location: \${draft.location}\\n\`;
    if (draft.peopleAffected) summary += \`People Affected: \${draft.peopleAffected}\\n\`;
    if (draft.evidenceAvailable) summary += \`Evidence: Yes\\n\`;
    summary += "\\nSab sahi hai? Haan/Yes ya Nahi/No bataiye.";`;

code = code.replace(summaryCode, newSummaryCode);
code = code.replace(`let summary = "Aapki complaint details ye hain:\\n\\n";`, `let summary = "Achha, complaint register karne se pehle ek baar details check kar lete hain:\\n\\n";`);

const validatedDataCode = `    const validatedData = {
      citizenName: draft.citizenName!,
      phone: draft.phone!,
      complaintType: draft.complaintType!,
      description: draft.description!,
      district: draft.district!,
      villageCityBlock: draft.villageCityBlock!,
      email: draft.email,
      location: draft.location,
      peopleAffected: typeof draft.peopleAffected === 'number' && draft.peopleAffected >= 0 ? draft.peopleAffected : undefined,
      priority: 'medium' as any, // Default priority
      status: 'open' as any
    };`;

const newValidatedDataCode = `    const validatedData = {
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
    };`;

code = code.replace(validatedDataCode, newValidatedDataCode);

const successCode = `"✅ Your complaint has been registered successfully.\\n\\nComplaint ID: \${complaint.complaintId}\\n\\nPlease keep this ID to check the status later."`;
const newSuccessCode = `"✅ Aapki complaint successfully register ho gayi hai.\\n\\nComplaint ID: \${complaint.complaintId}\\n\\nStatus check karne ke liye ye ID yaad rakhein."`;
code = code.replace(successCode, newSuccessCode);

code = code.replace(`  isCanceled?: boolean;\n};`, `  isCanceled?: boolean;\n  evidenceAvailable?: boolean;\n};`);

fs.writeFileSync(file, code);
