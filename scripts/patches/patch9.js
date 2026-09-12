const fs = require('fs');
const file = 'src/lib/ai/complaint-registration-flow.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /✅ Your complaint has been registered successfully\.\\n\\nComplaint ID: \$\{complaint\.complaintId\}\\n\\nPlease keep this ID to check the status later\./,
  "✅ Aapki complaint successfully register ho gayi hai.\\n\\nComplaint ID: ${complaint.complaintId}\\n\\nStatus check karne ke liye ye ID yaad rakhein."
);

fs.writeFileSync(file, code);
