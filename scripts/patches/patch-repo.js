const fs = require('fs');
let code = fs.readFileSync('src/lib/mongodb/repositories/ComplaintRepository.ts', 'utf8');
code = code.replace(
  /const complaint = new Complaint\(\{([\s\S]*?)\}\);\s*return complaint\.save\(\{ session \}\);/,
  "const complaint = await Complaint.create([{...data, _id: data._id || crypto.randomUUID(), accountId, complaintId}], { session });\n    return complaint[0];"
);
fs.writeFileSync('src/lib/mongodb/repositories/ComplaintRepository.ts', code);
