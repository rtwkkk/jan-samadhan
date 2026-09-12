const fs = require('fs');
let code = fs.readFileSync('src/components/interactive/interactive-builder.tsx', 'utf8');

code = code.replace(/import \{ slugify \} from "@\/components\/flows\/shared";\n/, '');

// insert slugify function
const slugifyFunc = `
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\\s+/g, '-')
    .replace(/[^\\w\\-]+/g, '')
    .replace(/\\-\\-+/g, '-');
}
`;
code = code.replace(/export function InteractiveBuilder/, slugifyFunc + '\nexport function InteractiveBuilder');

fs.writeFileSync('src/components/interactive/interactive-builder.tsx', code);
