const fs = require('fs');
const file = 'src/lib/ai/gemini-provider.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `      generationConfig: {
        temperature: 0.1, // Lower temperature for structured/predictable tasks
      }`,
  `      generationConfig: {
        temperature: 0.1, // Lower temperature for structured/predictable tasks
        maxOutputTokens: 1024,
      }`
);

fs.writeFileSync(file, code);
