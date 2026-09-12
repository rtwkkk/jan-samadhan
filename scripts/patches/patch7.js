const fs = require('fs');
const file = 'src/lib/ai/conversation-handler.test.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/"What is your full name\?"/, '"Aapka full name kya hai"');
code = code.replace(/"Sure! Please provide your complaint ID\."/, '"Zaroor! Kripya apna Complaint ID bhejein"');
code = code.replace(/"Sure! Please tell me how I can help you\."/, '"Zaroor! Batiye main aapki kya madad kar sakta hoon"');
code = code.replace(/"I didn't quite understand that"/, '"Maaf karna, mujhe theek se samajh nahi aaya"');

fs.writeFileSync(file, code);
