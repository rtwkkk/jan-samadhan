const fs = require('fs');
const file = 'src/lib/ai/complaint-registration-flow.test.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/'What is your full name'/g, "'Aapka full name kya hai'");
code = code.replace(/'What type of issue'/g, "'Aapko kis cheez ki problem hai'");
code = code.replace(/'Please confirm your complaint details'/g, "'Aapki complaint details ye hain'");
code = code.replace(/'Registration canceled'/g, "'Complaint cancel ho gayi hai'");
code = code.replace(/'Should I submit this complaint\? \(Yes \/ No\)'/g, "'Kya ye sahi hai? (Haan / Nahi bhejein)'");

fs.writeFileSync(file, code);
