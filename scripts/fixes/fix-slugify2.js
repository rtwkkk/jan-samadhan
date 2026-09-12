const fs = require('fs');
let code = fs.readFileSync('src/components/interactive/interactive-builder.tsx', 'utf8');

code = code.replace(/function slugify\(text: string\) \{/g, 'function slugify(text: string, fallback?: string) {');
code = code.replace(/return text/g, 'return (text || fallback || "")');

fs.writeFileSync('src/components/interactive/interactive-builder.tsx', code);
