const fs = require('fs');
const file = 'src/lib/ai/conversation-handler.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `let intent = 'UNKNOWN';`,
  `let intent: string | null = 'UNKNOWN';`
);

code = code.replace(
  `    switch (intent) {`,
  `    if (intent === null) {
      replyText = "Maaf karna, abhi kuch technical problem hai. Thodi der mein try karein.";
    } else {
      switch (intent) {`
);

code = code.replace(
  `        break;
    }`,
  `        break;
      }
    }`
);

fs.writeFileSync(file, code);
