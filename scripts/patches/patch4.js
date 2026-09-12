const fs = require('fs');
const file = 'src/lib/ai/conversation-handler.ts';
let code = fs.readFileSync(file, 'utf8');

const oldMenu = `const MENU_TEXT = \`Welcome to the Citizen Service Portal. How can I help you today?

1. Register Complaint
2. Check Complaint Status
3. Other Help

Please reply with 1, 2, or 3.\`;`;

const newMenu = `const MENU_TEXT = \`Namaskar! Citizen Service Portal mein aapka swagat hai. Main aapki kaise madad kar sakta hoon?

1. Register Complaint (Nayi shikayat darj karein)
2. Check Complaint Status (Apni shikayat ki sthiti dekhein)
3. Other Help (Anya madad)

Kripya 1, 2, ya 3 reply karein.\`;`;

code = code.replace(oldMenu, newMenu);
fs.writeFileSync(file, code);
